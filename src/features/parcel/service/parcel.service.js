import {
  getAvailableAreaDataRequirements,
  getAvailableAreaForAction
} from '~/src/features/available-area/availableArea.js'
import {
  actionTransformer,
  plannedActionsTransformer,
  sizeTransformer,
  sssiConsentRequiredActionTransformer
} from '~/src/api/parcel/transformers/parcelActions.transformer.js'
import { sqmToHaRounded } from '~/src/api/common/helpers/measurement.js'
import { getAgreementsForParcel } from '~/src/api/agreements/queries/getAgreementsForParcel.query.js'
import { mergeAgreementsTransformer } from '~/src/api/agreements/transformers/agreements.transformer.js'
import { getDataLayerQuery } from '~/src/api/data-layers/queries/getDataLayer.query.js'
import { executeSingleRuleForEnabledActions } from '~/src/features/rules-engine/rulesEngine.js'
import { sssiConsentRequired } from '~/src/features/rules-engine/rules/1.0.0/sssi-consent-required.js'

/**
 * @import {LandParcelDb} from '~/src/api/parcel/parcel.d.js'
 * @import {AgreementAction} from '~/src/api/agreements/agreements.d.js'
 * @import {Logger} from '~/src/api/common/logger.d.js'
 * @import {Pool} from '~/src/api/common/postgres.d.js'
 * @import {Action} from '~/src/api/actions/action.d.js'
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
export async function getParcelActionsWithAvailableArea(
  parcel,
  actions,
  showActionResults,
  enabledActions,
  compatibilityCheckFn,
  postgresDb,
  logger
) {
  const actionsWithAvailableArea = []

  for (const action of enabledActions.filter((a) => a.display)) {
    const transformedActions = plannedActionsTransformer(actions)

    const aacDataRequirements = await getAvailableAreaDataRequirements(
      action.code,
      parcel.sheet_id,
      parcel.parcel_id,
      transformedActions,
      postgresDb,
      logger
    )

    const availableArea = getAvailableAreaForAction(
      action.code,
      parcel.sheet_id,
      parcel.parcel_id,
      compatibilityCheckFn,
      transformedActions,
      aacDataRequirements,
      logger
    )

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
  request
) {
  const { fields, plannedActions } = payload

  const parcelResponse = {
    parcelId: parcel.parcel_id,
    sheetId: parcel.sheet_id
  }

  if (fields.includes('size')) {
    parcelResponse.size = sizeTransformer(sqmToHaRounded(parcel.area_sqm))
  }

  if (fields.some((f) => f.startsWith('actions'))) {
    const agreements = await getAgreementsForParcel(
      parcel.sheet_id,
      parcel.parcel_id,
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

    const sortedParcelActions = actionsWithAvailableArea.toSorted((a, b) =>
      a.code.localeCompare(b.code)
    )

    parcelResponse.actions = sortedParcelActions
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

  const intersectingAreaPercentage = await getDataLayerQuery(
    sheetId,
    parcelId,
    postgresDb,
    logger
  )

  const application = {
    areaAppliedFor: 0,
    actionCodeAppliedFor: '',
    landParcel: {
      area: 0,
      existingAgreements: [],
      intersections: {
        sssi: { intersectingAreaPercentage }
      }
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
