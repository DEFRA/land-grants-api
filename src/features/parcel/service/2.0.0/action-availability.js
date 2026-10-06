import {
  isAreaUnit,
  isLengthUnit
} from '~/src/features/common/constants/unit_type.js'
import { actionTransformer } from '~/src/features/parcel/transformers/2.0.0/parcelActions.transformer.js'
import { findMaximumAvailableArea } from '~/src/features/available-area/availableArea.js'
import { calculateAvailableLength } from '~/src/features/available-length/availableLength.js'
import { formatExplanationSections } from '~/src/features/available-area/explanations.js'
import { getAvailableAreaDataRequirements } from '~/src/features/available-area/availableAreaDataRequirements.js'
import { executeLengthRule, findLengthRule } from './length-rule.js'
import {
  areaUnavailableReason,
  exceedsBoundaryReason,
  lengthRuleReason
} from './unavailability.js'

/**
 * @import {LandParcelDb} from '~/src/features/parcel/parcel.d.js'
 * @import {Logger} from '~/src/features/common/logger.d.js'
 * @import {Pool} from '~/src/features/common/postgres.d.js'
 * @import {Action} from '~/src/features/actions/action.d.js'
 * @import {ActionWithArea, AvailableAreaDataRequirements, CompatibilityCheckFn} from '~/src/features/available-area/available-area.d.js'
 * @import {ActionWithLength} from '~/src/features/available-length/available-length.d.js'
 */

/**
 * Compute a single action's entry for the parcel actions response, running it
 * through the AAC when its unit competes for area. Always returns the action,
 * even at zero available area - see the feature readme.
 * @param {Action} action - The action to compute
 * @param {ActionWithArea[]} areaActions - The existing/planned actions competing for area
 * @param {AvailableAreaDataRequirements} availableAreaDataRequirements - The land cover and eligibility data
 * @param {object} context
 * @param {boolean} context.showActionResults - Whether to show action results
 * @param {CompatibilityCheckFn} context.compatibilityCheckFn - The compatibility check function
 * @returns {object} The transformed action
 */
function buildActionWithAvailableArea(
  action,
  areaActions,
  availableAreaDataRequirements,
  context
) {
  const { showActionResults, compatibilityCheckFn } = context

  const lpResult = findMaximumAvailableArea(
    action.code,
    areaActions,
    compatibilityCheckFn,
    availableAreaDataRequirements
  )

  const areaCalculation = {
    ...lpResult,
    unavailableReason: lpResult.feasible
      ? undefined
      : areaUnavailableReason(lpResult),
    explanations: formatExplanationSections(lpResult.context, {
      targetAction: action.code,
      availableAreaSqm: lpResult.availableAreaSqm,
      totalValidLandCoverSqm: lpResult.totalValidLandCoverSqm,
      landCoverToString: availableAreaDataRequirements.landCoverToString,
      feasible: lpResult.feasible
    })
  }

  return actionTransformer(action, areaCalculation, showActionResults)
}

/**
 * Compute a linear action's entry, deducting the boundary already committed to
 * incompatible actions. Actions that exceed the boundary outrank the action's
 * length rule: when the records cannot be right, that is what needs resolving
 * first.
 * @param {Action} action - The action to compute
 * @param {ActionWithLength[]} lengthActions - The existing/planned actions competing for the boundary
 * @param {number} boundaryLengthMeters - The parcel's perimeter
 * @param {object} context
 * @param {boolean} context.showActionResults - Whether to show action results
 * @param {CompatibilityCheckFn} context.compatibilityCheckFn - The compatibility check function
 * @returns {object} The transformed action
 */
function buildActionWithAvailableLength(
  action,
  lengthActions,
  boundaryLengthMeters,
  context
) {
  const { showActionResults, compatibilityCheckFn } = context

  const availableLength = calculateAvailableLength(
    action.code,
    lengthActions,
    compatibilityCheckFn,
    boundaryLengthMeters
  )

  if (availableLength.exceedsBoundary) {
    const lengthCalculation = {
      ...availableLength,
      unavailableReason: exceedsBoundaryReason(
        availableLength.incompatibleActions
      )
    }

    return actionTransformer(action, lengthCalculation, showActionResults)
  }

  const lengthRule = findLengthRule(action)

  if (lengthRule) {
    const lengthRuleResult = executeLengthRule(
      lengthRule,
      action.code,
      availableLength
    )

    if (!lengthRuleResult.passed) {
      const lengthCalculation = {
        ...availableLength,
        unavailableReason: lengthRuleReason(availableLength, lengthRuleResult)
      }

      return actionTransformer(action, lengthCalculation, showActionResults)
    }
  }

  return actionTransformer(action, availableLength, showActionResults)
}

/**
 * Compute one action's entry, fetching the data its unit's calculation needs.
 * The builders themselves are pure; the I/O belongs here.
 * @param {Action} action - The action to compute
 * @param {{area: ActionWithArea[], length: ActionWithLength[]}} competingActions - What competes on this parcel
 * @param {object} context
 * @param {boolean} context.showActionResults - Whether to show action results
 * @param {CompatibilityCheckFn} context.compatibilityCheckFn - The compatibility check function
 * @param {number|null} context.boundaryLengthMeters - The parcel's perimeter
 * @param {LandParcelDb} context.parcel - The parcel
 * @param {Pool} context.postgresDb - The postgres database
 * @param {Logger} context.logger - The logger
 * @returns {Promise<object>} The transformed action
 */
export async function buildActionWithAvailability(
  action,
  competingActions,
  context
) {
  const {
    showActionResults,
    compatibilityCheckFn,
    boundaryLengthMeters,
    parcel,
    postgresDb,
    logger
  } = context
  const unit = action.applicationUnitOfMeasurement

  if (isAreaUnit(unit)) {
    const availableAreaDataRequirements =
      await getAvailableAreaDataRequirements(
        action.code,
        parcel.sheet_id,
        parcel.parcel_id,
        competingActions.area,
        postgresDb,
        logger
      )

    return buildActionWithAvailableArea(
      action,
      competingActions.area,
      availableAreaDataRequirements,
      { showActionResults, compatibilityCheckFn }
    )
  }

  if (isLengthUnit(unit) && boundaryLengthMeters !== null) {
    return buildActionWithAvailableLength(
      action,
      competingActions.length,
      boundaryLengthMeters,
      { showActionResults, compatibilityCheckFn }
    )
  }

  // No ceiling to report: a count action, or a perimeter that could not be read
  return actionTransformer(action, undefined, showActionResults)
}
