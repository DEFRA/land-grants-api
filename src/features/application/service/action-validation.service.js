import {
  DATA_LAYER_TYPES,
  getDataLayerQueryAccumulated,
  getDataLayerQueryUnion
} from '../../data-layers/queries/getDataLayer.query.js'
import { HECTARES, METERS } from '~/src/features/common/constants/unit_type.js'
import { actionResultTransformer } from '~/src/features/application/transformers/application.transformer.js'
import { executeRules } from '~/src/features/rules-engine/rulesEngine.js'
import { findMaximumAvailableArea } from '~/src/features/available-area/availableArea.js'
import { formatExplanationSections } from '~/src/features/available-area/explanations.js'
import { getAvailableAreaDataRequirements } from '~/src/features/available-area/availableAreaDataRequirements.js'
import { getLandData } from '../../parcel/queries/getLandData.query.js'
import { getLfaInterceptPercentage } from '~/src/features/parcel/queries/getLfaInterceptPercentage.js'
import { getMoorlandInterceptPercentage } from '~/src/features/parcel/queries/getMoorlandInterceptPercentage.js'
import { haToSqm } from '~/src/features/common/helpers/measurement.js'
import { plannedActionsTransformer } from '../../parcel/transformers/parcelActions.transformer.js'
import { rules } from '~/src/features/rules-engine/rules/index.js'
import { getAvailableLength } from '../../available-length/availableLength.js'
import { createFilterActionByUnit } from '../../common/helpers/filter-action-by-unit.js'

/**
 * Find the available area for a land action, only for land-area-based (hectare) actions
 * @param {ActionRequest} action - The action
 * @param {Action[]} actions - All enabled actions
 * @param {AgreementAction[]} agreements - The agreements
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Compatibility check function
 * @param {LandAction} landAction - The land action
 * @param {{logger: object, server: {postgresDb: object}}} request - The request object
 * @returns {Promise<object>} The validation result
 */
async function getAvailableArea(
  action,
  actions,
  agreements,
  compatibilityCheckFn,
  landAction,
  request
) {
  // Other actions requested for this same parcel in this submission also
  // compete for the parcel's area, alongside persisted agreements - both
  // are treated as "existing" demand when computing this action's available area.
  // Non-area actions (e.g. count/item-based actions like WBD1) don't compete
  // for area, so they're excluded rather than mismeasured as hectares.

  const filterActionByUnit = createFilterActionByUnit(actions, HECTARES)
  const siblingActions = landAction.actions
    .filter((a) => a !== action)
    .filter(filterActionByUnit)
    .map((a) => ({ actionCode: a.code, areaSqm: haToSqm(a.quantity) }))

  const existingActions = [
    ...plannedActionsTransformer(agreements),
    ...siblingActions
  ]

  const aacDataRequirements = await getAvailableAreaDataRequirements(
    action.code,
    landAction.sheetId,
    landAction.parcelId,
    existingActions,
    request.server.postgresDb,
    request.logger
  )

  const lpResult = findMaximumAvailableArea(
    action.code,
    existingActions,
    compatibilityCheckFn,
    aacDataRequirements
  )

  return {
    ...lpResult,
    explanations: formatExplanationSections(lpResult.context, {
      targetAction: action.code,
      availableAreaSqm: lpResult.availableAreaSqm,
      totalValidLandCoverSqm: lpResult.totalValidLandCoverSqm,
      landCoverToString: aacDataRequirements.landCoverToString,
      feasible: lpResult.feasible
    })
  }
}

/**
 * Validate a land action
 * @param {ActionRequest} action - The action
 * @param {Action[]} actions - All enabled actions
 * @param {AgreementAction[]} agreements - The agreements
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Compatibility check function
 * @param {LandAction} landAction - The land action
 * @param {{logger: object, server: {postgresDb: object}}} request - The request object
 * @returns {Promise<ActionRuleResult>} The validation result
 */
export const validateLandAction = async (
  action,
  actions,
  agreements,
  compatibilityCheckFn,
  landAction,
  request
) => {
  if (!landAction || !actions || !compatibilityCheckFn) {
    throw new Error('Unable to validate land action')
  }

  const unit = actions.find(
    (a) => a.code === action.code
  )?.applicationUnitOfMeasurement

  let availableArea = null
  let availableLength = null

  if (unit === HECTARES) {
    availableArea = await getAvailableArea(
      action,
      actions,
      agreements,
      compatibilityCheckFn,
      landAction,
      request
    )
  }
  if (unit === METERS) {
    availableLength = await getAvailableLength(
      action,
      actions,
      agreements,
      compatibilityCheckFn,
      landAction,
      request
    )
  }

  const application = await buildRuleEngineApplication(
    action,
    landAction,
    availableArea,
    availableLength,
    agreements,
    request
  )

  const ruleToExecute = actions.find((a) => a.code === action.code)
  const ruleResult = executeRules(
    rules,
    {
      ...application,
      parcelId: landAction.parcelId,
      sheetId: landAction.sheetId,
      actionCode: action.code
    },
    ruleToExecute?.rules
  )
  return actionResultTransformer(action, actions, availableArea, ruleResult)
}

/**
 * Fetches parcel data layers and builds the rule engine application object.
 * @param {ActionRequest} action
 * @param {LandAction} landAction
 * @param {object|null} availableArea
 * @param {{availableLength: number}|null} availableLength
 * @param {AgreementAction[]} agreements
 * @param {{logger: object, server: {postgresDb: object}}} request
 * @returns {Promise<RuleEngineApplication>}
 */
const buildRuleEngineApplication = async (
  action,
  landAction,
  availableArea,
  availableLength,
  agreements,
  request
) => {
  const [
    moorlandIntersectingAreaPercentage,
    lfaIntersectingAreaPercentage,
    sssiDataLayerData,
    historicFeaturesDataLayerData,
    landParcel
  ] = await Promise.all([
    getMoorlandInterceptPercentage(
      landAction.sheetId,
      landAction.parcelId,
      request.server.postgresDb,
      request.logger
    ),
    getLfaInterceptPercentage(
      landAction.sheetId,
      landAction.parcelId,
      request.server.postgresDb,
      request.logger
    ),
    getDataLayerQueryAccumulated(
      landAction.sheetId,
      landAction.parcelId,
      DATA_LAYER_TYPES.sssi,
      request.server.postgresDb,
      request.logger
    ),
    getDataLayerQueryUnion(
      landAction.sheetId,
      landAction.parcelId,
      DATA_LAYER_TYPES.historic_features,
      request.server.postgresDb,
      request.logger
    ),
    getLandData(
      landAction.sheetId,
      landAction.parcelId,
      request.server.postgresDb,
      request.logger
    )
  ])

  let appliedForQuantity
  if (availableArea) {
    appliedForQuantity = action.quantity
  } else if (availableLength) {
    appliedForQuantity = Math.round(action.quantity)
  } else {
    appliedForQuantity = 0
  }

  return {
    appliedForQuantity,
    actionCodeAppliedFor: action.code,
    landParcel: {
      availableAreaSqm: availableArea?.availableAreaSqm ?? null,
      availability:
        availableArea?.availableAreaSqm ??
        availableLength?.availableLength ??
        0,
      existingAgreements: agreements,
      intersections: {
        moorland: {
          intersectingAreaPercentage: moorlandIntersectingAreaPercentage
        },
        lfa: { intersectingAreaPercentage: lfaIntersectingAreaPercentage },
        sssi: sssiDataLayerData,
        historic_features: historicFeaturesDataLayerData
      },
      parcelSizeSqm: landParcel?.[0]?.area ?? 0
    }
  }
}

/**
 * @import { ActionRequest } from '~/src/features/application/application.d.js'
 * @import { ActionRuleResult, Action } from '~/src/features/actions/action.d.js'
 * @import { AgreementAction } from '~/src/features/agreements/agreements.d.js'
 * @import { CompatibilityCheckFn } from '~/src/features/available-area/available-area.d.js'
 * @import { LandAction } from '~/src/features/payment/payment.d.js'
 * @import { RuleEngineApplication } from '~/src/features/rules-engine/rules.d.js'
 */
