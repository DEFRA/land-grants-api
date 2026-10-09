import { findMaximumAvailableArea } from '~/src/features/available-area/availableArea.js'
import { getAvailableAreaDataRequirements } from '~/src/features/available-area/availableAreaDataRequirements.js'
import { formatExplanationSections } from '~/src/features/available-area/explanations.js'
import {
  HECTARES,
  isAreaUnit
} from '~/src/features/common/constants/unit_type.js'
import { haToSqm } from '~/src/features/common/helpers/measurement.js'
import { areaActionsTransformer } from '../../parcel/transformers/parcelActions.transformer.js'

/**
 * Find the available area for a land action, only for land-area-based (hectare or sqm) actions
 * @param {Pick<ActionRequest, 'code'>} action - The action
 * @param {Action[]} actions - All enabled actions
 * @param {AgreementAction[]} agreements - The agreements
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Compatibility check function
 * @param {Omit<LandAction, 'sbi'>} landAction - The land action
 * @param {object} db - The database
 * @param {object} logger - The logger
 * @returns {Promise<object>} The validation result
 */
export async function getAvailableArea(
  action,
  actions,
  agreements,
  compatibilityCheckFn,
  landAction,
  db,
  logger
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
    ...areaActionsTransformer(areaAgreements),
    ...siblingActions
  ]

  const aacDataRequirements = await getAvailableAreaDataRequirements(
    action.code,
    landAction.sheetId,
    landAction.parcelId,
    existingActions,
    db,
    logger
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
 * @import { ActionRequest } from '~/src/features/application/application.d.js'
 * @import { Action } from '~/src/features/actions/action.d.js'
 * @import { AgreementAction } from '~/src/features/agreements/agreements.d.js'
 * @import { CompatibilityCheckFn } from '~/src/features/available-area/available-area.d.js'
 * @import { LandAction } from '~/src/features/payment/payment.d.js'
 */
