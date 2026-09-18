import {
  DATA_LAYER_TYPES,
  getDataLayerQueryAccumulated,
  getDataLayerQueryUnion
} from '../../data-layers/queries/getDataLayer.query.js'
import {
  HECTARES,
  METERS,
  isAreaUnit
} from '~/src/features/common/constants/unit_type.js'
import { actionResultTransformer } from '~/src/features/application/transformers/application.transformer.js'
import { executeRules } from '~/src/features/rules-engine/rulesEngine.js'
import { findMaximumAvailableArea } from '~/src/features/available-area/availableArea.js'
import { formatExplanationSections } from '~/src/features/available-area/explanations.js'
import { getAvailableAreaDataRequirements } from '~/src/features/available-area/availableAreaDataRequirements.js'
import { getLandData } from '../../parcel/queries/getLandData.query.js'
import { getLfaIntersectPercentage } from '~/src/features/parcel/queries/getLfaIntersectPercentage.js'
import { getMoorlandIntersectPercentage } from '~/src/features/parcel/queries/getMoorlandIntersectPercentage.js'
import { getSdaIntersectPercentage } from '~/src/features/parcel/queries/getSdaIntersectPercentage.js'
import { haToSqm } from '~/src/features/common/helpers/measurement.js'
import { plannedActionsTransformer } from '../../parcel/transformers/parcelActions.transformer.js'
import { rules } from '~/src/features/rules-engine/rules/index.js'
import { getAvailableLength } from '../../available-length/availableLength.js'
import { getLandCoversForParcel } from '../../parcel/queries/getLandCoversForParcel.query.js'
import { getLandCoversForAction } from '../../land-cover-codes/queries/getLandCoversForActions.query.js'

/**
 * Find the available area for a land action, only for land-area-based (hectare or sqm) actions
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
  // Each sibling's own configured unit decides whether its quantity needs
  // converting from hectares, or is already area-native (e.g. sqm). Where
  // there is no enabled-action config, fall back to hectares.
  const findConfiguredUnit = (code) =>
    actions.find((config) => config.code === code)?.applicationUnitOfMeasurement
  const siblingActions = landAction.actions
    .filter((a) => a !== action)
    .filter((a) => {
      const configuredUnit = findConfiguredUnit(a.code)
      return configuredUnit === undefined || isAreaUnit(configuredUnit)
    })
    .map((a) => ({
      actionCode: a.code,
      areaSqm:
        (findConfiguredUnit(a.code) ?? HECTARES) === HECTARES
          ? haToSqm(a.quantity)
          : a.quantity
    }))

  // Agreements arrive in every unit; only area-based ones compete for area.
  const areaAgreements = agreements.filter((a) => isAreaUnit(a.unit))
  const existingActions = [
    ...plannedActionsTransformer(areaAgreements),
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

  if (isAreaUnit(unit)) {
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
    request,
    unit
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
 * @param {AvailableLength|null} availableLength
 * @param {AgreementAction[]} agreements
 * @param {{logger: object, server: {postgresDb: object}}} request
 * @param {string} [applicationUnitOfMeasurement] - The applying-for action's configured unit
 * @returns {Promise<RuleEngineApplication>}
 */
const buildRuleEngineApplication = async (
  action,
  landAction,
  availableArea,
  availableLength,
  agreements,
  request,
  applicationUnitOfMeasurement
) => {
  const { sheetId, parcelId } = landAction
  const db = request.server.postgresDb
  const logger = request.logger

  const [intersections, landParcel, landCovers, landCoversForAction] =
    await Promise.all([
      getIntersections(sheetId, parcelId, db, logger),
      getLandData(sheetId, parcelId, db, logger),
      getLandCoversForParcel(sheetId, parcelId, db, logger),
      getLandCoversForAction(action.code, db, logger)
    ])

  return {
    appliedForQuantity: getAppliedForQuantity(
      availableArea,
      availableLength,
      action
    ),
    applicationUnitOfMeasurement,
    actionCodeAppliedFor: action.code,
    actionLandCovers: landCoversForAction ?? [],
    landParcel: {
      availableAreaSqm: availableArea?.availableAreaSqm ?? null,
      availability:
        availableArea?.availableAreaSqm ??
        availableLength?.availableLength ??
        0,
      boundaryLength: availableLength
        ? {
            totalMeters: availableLength.boundaryLengthMeters,
            incompatibleMeters: availableLength.incompatibleLengthMeters
          }
        : null,
      existingAgreements: agreements,
      intersections,
      parcelSizeSqm: landParcel?.[0]?.area ?? 0,
      landCovers: landCovers ?? []
    }
  }
}

/**
 * Fetches every data layer intersection for the parcel, keyed by the
 * layerName that action config rules refer to.
 * @param {string} sheetId
 * @param {string} parcelId
 * @param {object} db
 * @param {object} logger
 * @returns {Promise<object>}
 */
async function getIntersections(sheetId, parcelId, db, logger) {
  const [
    moorland,
    lessFavouredArea,
    severelyDisadvantagedArea,
    sssi,
    historicFeatures
  ] = await Promise.all([
    getMoorlandIntersectPercentage(sheetId, parcelId, db, logger),
    getLfaIntersectPercentage(sheetId, parcelId, db, logger),
    getSdaIntersectPercentage(sheetId, parcelId, db, logger),
    getDataLayerQueryAccumulated(
      sheetId,
      parcelId,
      DATA_LAYER_TYPES.sssi,
      db,
      logger
    ),
    getDataLayerQueryUnion(
      sheetId,
      parcelId,
      DATA_LAYER_TYPES.historic_features,
      db,
      logger
    )
  ])

  return {
    moorland: { intersectingAreaPercentage: moorland },
    lfa: { intersectingAreaPercentage: lessFavouredArea },
    sda: { intersectingAreaPercentage: severelyDisadvantagedArea },
    sssi,
    historic_features: historicFeatures
  }
}

/**
 * get the applied for quantity based on available area and length.
 * @param {number} availableArea
 * @param {AvailableLength|null} availableLength
 * @param {ActionRequest} action
 * @returns {number}
 */
function getAppliedForQuantity(availableArea, availableLength, action) {
  if (availableArea) {
    return action.quantity
  }

  if (availableLength) {
    return Math.round(action.quantity)
  }

  return 0
}

/**
 * @import { ActionRequest } from '~/src/features/application/application.d.js'
 * @import { ActionRuleResult, Action } from '~/src/features/actions/action.d.js'
 * @import { AgreementAction } from '~/src/features/agreements/agreements.d.js'
 * @import { AvailableLength } from '~/src/features/available-length/available-length.d.js'
 * @import { CompatibilityCheckFn } from '~/src/features/available-area/available-area.d.js'
 * @import { LandAction } from '~/src/features/payment/payment.d.js'
 * @import { RuleEngineApplication } from '~/src/features/rules-engine/rules.d.js'
 */
