import {
  DATA_LAYER_TYPES,
  getDataLayerQueryAccumulated,
  getDataLayerQueryUnion
} from '~/src/features/data-layers/queries/getDataLayer.query.js'
import { HECTARES } from '~/src/features/common/constants/unit_type.js'
import { actionTransformer } from '~/src/features/parcel/transformers/2.0.0/parcelActions.transformer.js'
import { executeSingleRuleForEnabledActions } from '~/src/features/rules-engine/rulesEngine.js'
import {
  findMaximumAvailableArea,
  throwIfInfeasible
} from '~/src/features/available-area/availableArea.js'
import { formatExplanationSections } from '~/src/features/available-area/explanations.js'
import { getAgreements } from '~/src/features/agreements/repo.js'
import { getAvailableAreaDataRequirements } from '~/src/features/available-area/availableAreaDataRequirements.js'
import { heferConsentRequired } from '~/src/features/rules-engine/rules/1.0.0/hefer-consent-required.js'
import {
  heferRequiredActionTransformer,
  plannedActionsTransformer,
  sizeTransformer,
  sssiConsentRequiredActionTransformer
} from '~/src/features/parcel/transformers/parcelActions.transformer.js'
import { mergeAgreementsTransformer } from '~/src/features/agreements/transformers/agreements.transformer.js'
import { sqmToHaRounded } from '~/src/features/common/helpers/measurement.js'
import { sssiConsentRequired } from '~/src/features/rules-engine/rules/1.0.0/sssi-consent-required.js'

/**
 * @import {LandParcelDb} from '~/src/features/parcel/parcel.d.js'
 * @import {AgreementAction} from '~/src/features/agreements/agreements.d.js'
 * @import {Logger} from '~/src/features/common/logger.d.js'
 * @import {Pool} from '~/src/features/common/postgres.d.js'
 * @import {Action} from '~/src/features/actions/action.d.js'
 */

/**
 * Split id into sheet id and parcel id
 * @param {string} id - 6-character long alpha-numeric string - 4-character long numeric string
 * @returns {object} The sheet id and parcel id
 */
export function splitParcelId(id, logger) {
  try {
    const parts = id?.split('-')
    const sheetId = parts?.[0] || null
    const parcelId = parts?.[1] || null

    if (!sheetId || !parcelId) {
      throw new Error(`Unable to split parcel id ${id}`)
    }

    return {
      sheetId,
      parcelId
    }
  } catch (error) {
    logger.error(`Unable to split parcel id ${id}`, error)
    throw error
  }
}

/**
 * Get parcel actions with available area
 * @param {LandParcelDb} parcel - The parcel
 * @param {AgreementAction[]} actions - The actions to get
 * @param {boolean} showActionResults - Whether to show action results
 * @param {Action[]} enabledActions - The enabled actions
 * @param {Function} compatibilityCheckFn - The compatibility check function
 * @param {Pool} postgresDb - The postgres database
 * @param {Logger} logger - The logger
 * @returns {Promise<any[]>} The parcel actions with available area
 */
async function getParcelActionsWithAvailableArea(
  parcel,
  actions,
  showActionResults,
  enabledActions,
  compatibilityCheckFn,
  postgresDb,
  logger
) {
  const actionsWithAvailableArea = []
  const unitsByCode = enabledActions.reduce(
    (acc, e) => ({ ...acc, [e.code]: e.applicationUnitOfMeasurement }),
    {}
  )

  for (const action of enabledActions.filter((a) => a.display)) {
    // Non-hectare actions should not go through AAC calculations
    if (action.applicationUnitOfMeasurement !== HECTARES) {
      actionsWithAvailableArea.push(
        actionTransformer(action, undefined, showActionResults)
      )
      continue
    }

    // Non-hectare actions also shoul(dn't be taken into consideration for AACs for other actions
    // TODO: Note that existing agreements we don't have configs for may cause issues here
    const transformedActions = plannedActionsTransformer(
      actions.filter(
        (a) => (unitsByCode[a.actionCode] ?? HECTARES) === HECTARES
      )
    )

    const aacDataRequirements = await getAvailableAreaDataRequirements(
      action.code,
      parcel.sheet_id,
      parcel.parcel_id,
      transformedActions,
      postgresDb,
      logger
    )

    const lpResult = findMaximumAvailableArea(
      action.code,
      transformedActions,
      compatibilityCheckFn,
      aacDataRequirements
    )

    throwIfInfeasible(lpResult, parcel.sheet_id, parcel.parcel_id)

    const availableArea = {
      ...lpResult,
      explanations: formatExplanationSections(lpResult.context, {
        targetAction: action.code,
        availableAreaSqm: lpResult.availableAreaSqm,
        totalValidLandCoverSqm: lpResult.totalValidLandCoverSqm,
        landCoverToString: aacDataRequirements.landCoverToString,
        feasible: lpResult.feasible
      })
    }

    const actionWithAvailableArea = actionTransformer(
      action,
      availableArea,
      showActionResults
    )

    actionsWithAvailableArea.push(actionWithAvailableArea)
  }

  return actionsWithAvailableArea
}

export async function getActionsForParcel(
  parcel,
  payload,
  showActionResults,
  enabledActions,
  compatibilityCheckFn,
  request,
  defraIdToken
) {
  const { fields, plannedActions, sbi } = payload

  const parcelResponse = {
    parcelId: parcel.parcel_id,
    sheetId: parcel.sheet_id
  }

  if (fields.includes('size')) {
    parcelResponse.size = sizeTransformer(
      sqmToHaRounded(parcel.area_sqm),
      HECTARES
    )
  }

  if (fields.some((f) => f.startsWith('actions'))) {
    const agreements = await getAgreements(
      sbi,
      parcel.sheet_id,
      parcel.parcel_id,
      defraIdToken,
      request.server.postgresDb,
      request.logger
    )

    const mergedActions = mergeAgreementsTransformer(agreements, plannedActions)

    const actionsWithAvailableArea = await getParcelActionsWithAvailableArea(
      parcel,
      mergedActions,
      showActionResults,
      enabledActions,
      compatibilityCheckFn,
      request.server.postgresDb,
      request.logger
    )

    parcelResponse.actions = actionsWithAvailableArea
  }
  return parcelResponse
}

export async function getActionsForParcelWithSSSIConsentRequired(
  parcelIds,
  responseParcels,
  enabledActions,
  logger,
  postgresDb
) {
  const { sheetId, parcelId } = splitParcelId(parcelIds[0], logger)

  const { intersectingAreaPercentage } = await getDataLayerQueryAccumulated(
    sheetId,
    parcelId,
    DATA_LAYER_TYPES.sssi,
    postgresDb,
    logger
  )

  const application = {
    appliedForQuantity: 0,
    actionCodeAppliedFor: '',
    landParcel: {
      availableAreaSqm: 0,
      parcelSizeSqm: 0,
      existingAgreements: [],
      intersections: {
        sssi: { intersectingAreaPercentage }
      },
      availability: 0
    }
  }

  const sssiConsentRequiredAction = executeSingleRuleForEnabledActions(
    enabledActions,
    application,
    'sssi-consent-required',
    sssiConsentRequired
  )

  return sssiConsentRequiredActionTransformer(
    responseParcels,
    sssiConsentRequiredAction
  )
}

export async function getActionsForParcelWithHEFERConsentRequired(
  parcelIds,
  responseParcels,
  enabledActions,
  logger,
  postgresDb
) {
  const { sheetId, parcelId } = splitParcelId(parcelIds[0], logger)

  const { intersectingAreaPercentage } = await getDataLayerQueryUnion(
    sheetId,
    parcelId,
    DATA_LAYER_TYPES.historic_features,
    postgresDb,
    logger
  )

  const application = {
    appliedForQuantity: 0,
    actionCodeAppliedFor: '',
    landParcel: {
      availableAreaSqm: 0,
      parcelSizeSqm: 0,
      existingAgreements: [],
      intersections: {
        historic_features: { intersectingAreaPercentage }
      },
      availability: 0
    }
  }

  const heferRequiredAction = executeSingleRuleForEnabledActions(
    enabledActions,
    application,
    'hefer-consent-required',
    heferConsentRequired
  )

  return heferRequiredActionTransformer(responseParcels, heferRequiredAction)
}
