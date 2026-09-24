import {
  DATA_LAYER_TYPES,
  getDataLayerQueryAccumulated,
  getDataLayerQueryUnion
} from '~/src/features/data-layers/queries/getDataLayer.query.js'
import { getBoundaryIntersection } from '~/src/features/data-layers/queries/getBoundaryIntersection.query.js'
import {
  HECTARES,
  METERS,
  isAreaUnit
} from '~/src/features/common/constants/unit_type.js'
import { actionTransformer } from '~/src/features/parcel/transformers/2.0.0/parcelActions.transformer.js'
import { executeSingleRuleForEnabledActions } from '~/src/features/rules-engine/rulesEngine.js'
import { rules } from '~/src/features/rules-engine/rules/index.js'
import { findMaximumAvailableArea } from '~/src/features/available-area/availableArea.js'
import { formatExplanationSections } from '~/src/features/available-area/explanations.js'
import { getAvailableAreaDataRequirements } from '~/src/features/available-area/availableAreaDataRequirements.js'
import {
  heferRequiredActionTransformer,
  plannedActionsTransformer,
  sizeTransformer,
  sssiConsentRequiredActionTransformer
} from '~/src/features/parcel/transformers/parcelActions.transformer.js'
import { mergeAgreementsTransformer } from '~/src/features/agreements/transformers/agreements.transformer.js'
import { sqmToHaRounded } from '~/src/features/common/helpers/measurement.js'
import { logValidationWarn } from '~/src/features/common/helpers/logging/log-helpers.js'

/**
 * @import {LandParcelDb} from '~/src/features/parcel/parcel.d.js'
 * @import {AgreementAction} from '~/src/features/agreements/agreements.d.js'
 * @import {Logger} from '~/src/features/common/logger.d.js'
 * @import {Pool} from '~/src/features/common/postgres.d.js'
 * @import {Action} from '~/src/features/actions/action.d.js'
 * @import {RuleEngineApplication} from '~/src/features/rules-engine/rules.d.js'
 * @import {AacContext} from '~/src/features/available-area/available-area.d.js'
 */

/**
 * The area recorded against a parcel's existing actions. Reported when it
 * cannot be arranged on the land, which is the figure the RPA needs to see.
 * @param {AacContext|null} context - Context from the area calculation
 * @returns {number} The committed area in square metres
 */
function existingActionsArea(context) {
  const existingActions = context?.existingActions ?? []
  return existingActions.reduce((total, a) => total + a.areaSqm, 0)
}

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
 * Compute a single action's entry for the parcel actions response, running it
 * through the AAC when its unit competes for area. Always returns the action,
 * even at zero available area - A.C.: given a land parcel has no available
 * building area, do not display the building-related action as an option for
 * that parcel is satisfied by grants-ui's own hasAvailableLand/
 * isVisibleOnInitialLoad filtering (any action, any unit), which only sees
 * the current figure if this endpoint keeps reporting the action rather than
 * omitting it - grants-ui's mergeRecomputedAvailability only overwrites an
 * action's availability when it finds a matching code in this response, so
 * omitting a now-zero action here would leave its stale, previously-fetched
 * availability in place instead of updating it to zero.
 * @param {Action} action - The action to compute
 * @param {AgreementAction[]} actions - The existing/planned actions competing for area
 * @param {Record<string, string|undefined>} unitsByCode - Configured unit of measurement by action code
 * @param {object} context
 * @param {boolean} context.showActionResults - Whether to show action results
 * @param {Function} context.compatibilityCheckFn - The compatibility check function
 * @param {LandParcelDb} context.parcel - The parcel
 * @param {Pool} context.postgresDb - The postgres database
 * @param {Logger} context.logger - The logger
 * @returns {Promise<object>} The transformed action
 */
async function buildActionWithAvailableArea(
  action,
  actions,
  unitsByCode,
  context
) {
  const {
    showActionResults,
    compatibilityCheckFn,
    parcel,
    postgresDb,
    logger
  } = context

  // Non-area actions (e.g. count/linear) should not go through AAC calculations
  if (!isAreaUnit(action.applicationUnitOfMeasurement)) {
    return actionTransformer(action, undefined, showActionResults)
  }

  // Non-area actions also shouldn't be taken into consideration for AACs for other actions
  // Where there is no enabled-action config, fall back to the action's own unit
  const areaActions = actions.filter((a) => {
    const configuredUnit = unitsByCode[a.actionCode]
    return configuredUnit === undefined
      ? isAreaUnit(a.unit)
      : isAreaUnit(configuredUnit)
  })
  const transformedActions = plannedActionsTransformer(areaActions)

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

  const availableArea = {
    ...lpResult,
    existingActionsAreaSqm: lpResult.feasible
      ? undefined
      : existingActionsArea(lpResult.context),
    explanations: formatExplanationSections(lpResult.context, {
      targetAction: action.code,
      availableAreaSqm: lpResult.availableAreaSqm,
      totalValidLandCoverSqm: lpResult.totalValidLandCoverSqm,
      landCoverToString: aacDataRequirements.landCoverToString,
      feasible: lpResult.feasible
    })
  }

  return actionTransformer(action, availableArea, showActionResults)
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
    const actionWithAvailableArea = await buildActionWithAvailableArea(
      action,
      actions,
      unitsByCode,
      { showActionResults, compatibilityCheckFn, parcel, postgresDb, logger }
    )

    actionsWithAvailableArea.push(actionWithAvailableArea)
  }

  const unavailableActions = actionsWithAvailableArea.filter(
    (a) => !a.isAvailable
  )

  if (unavailableActions.length > 0) {
    logValidationWarn(logger, {
      operation: 'Available area calculation',
      errors: 'Existing actions do not fit the parcel land covers',
      context: {
        sheetId: parcel.sheet_id,
        parcelId: parcel.parcel_id,
        actionCodes: unavailableActions.map((a) => a.code).join(',')
      }
    })
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
  agreements
) {
  const { fields, plannedActions } = payload

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

/**
 * Builds the rule engine application for a consent check on one layer. Area
 * actions read intersections[layer]; a displayed linear action's rule reads
 * boundaryIntersections[layer] instead, so that is only measured when one exists.
 * @param {string} layer - The layerName the consent rules refer to
 * @param {Function} areaQuery - The data layer query for the area intersection
 * @param {Action[]} enabledActions - The enabled actions
 * @param {{sheetId: string, parcelId: string}} parcel - The parcel
 * @param {Pool} postgresDb - The postgres database
 * @param {Logger} logger - The logger
 * @returns {Promise<RuleEngineApplication>}
 */
async function getConsentApplication(
  layer,
  areaQuery,
  enabledActions,
  { sheetId, parcelId },
  postgresDb,
  logger
) {
  const hasDisplayedLinearAction = enabledActions.some(
    (a) => a.enabled && a.display && a.applicationUnitOfMeasurement === METERS
  )

  const [areaIntersection, boundaryIntersection] = await Promise.all([
    areaQuery(sheetId, parcelId, DATA_LAYER_TYPES[layer], postgresDb, logger),
    hasDisplayedLinearAction
      ? getBoundaryIntersection(
          sheetId,
          parcelId,
          DATA_LAYER_TYPES[layer],
          postgresDb,
          logger
        )
      : null
  ])

  return {
    appliedForQuantity: 0,
    actionCodeAppliedFor: '',
    landParcel: {
      availableAreaSqm: 0,
      parcelSizeSqm: 0,
      existingAgreements: [],
      intersections: { [layer]: areaIntersection },
      boundaryIntersections: { [layer]: boundaryIntersection },
      availability: 0
    }
  }
}

export async function getActionsForParcelWithSSSIConsentRequired(
  parcelIds,
  responseParcels,
  enabledActions,
  logger,
  postgresDb
) {
  const application = await getConsentApplication(
    'sssi',
    getDataLayerQueryAccumulated,
    enabledActions,
    splitParcelId(parcelIds[0], logger),
    postgresDb,
    logger
  )

  const sssiConsentRequiredAction = executeSingleRuleForEnabledActions(
    rules,
    enabledActions,
    application,
    'sssi-consent-required'
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
  const application = await getConsentApplication(
    'historic_features',
    getDataLayerQueryUnion,
    enabledActions,
    splitParcelId(parcelIds[0], logger),
    postgresDb,
    logger
  )

  const heferRequiredAction = executeSingleRuleForEnabledActions(
    rules,
    enabledActions,
    application,
    'hefer-consent-required'
  )

  return heferRequiredActionTransformer(responseParcels, heferRequiredAction)
}
