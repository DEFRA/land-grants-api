import {
  haToSqm,
  sqmToHaRounded
} from '~/src/features/common/helpers/measurement.js'

/**
 * @import { RuleEngineApplication } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 */

/**
 * @param {RuleEngineApplication} application - The application to execute the rule on
 * @param {ActionRule} rule - The rule to execute
 * @returns {RuleResultItem} - The result of the rule
 */
export const minMaxParcelSize = {
  execute: (application, rule) => {
    const name = rule.name
    const {
      landParcel: { availableAreaSqm }
    } = application
    const { minimumParcelSizeSqm, maximumParcelSizeSqm } = rule.config

    const explanations = [
      {
        title: 'Minimum and maximum parcel size',
        lines: [`The parcel size is ${availableAreaSqm}`]
      }
    ]

    if (!minimumParcelSizeSqm && !maximumParcelSizeSqm) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `Missing config for minimum and maximum sizes`,
        explanations
      }
    }

    if (
      minimumParcelSizeSqm &&
      maximumParcelSizeSqm &&
      minimumParcelSizeSqm > maximumParcelSizeSqm
    ) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason:
          'Minimum expected parcel size is greater than configured maximum size',
        explanations
      }
    }

    if (minimumParcelSizeSqm && availableAreaSqm < minimumParcelSizeSqm) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `The parcel size is below the minimum configured parcel size ${sqmToHaRounded(minimumParcelSizeSqm)}ha`,
        explanations
      }
    }
    if (maximumParcelSizeSqm && availableAreaSqm > maximumParcelSizeSqm) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `The parcel size is above the maximum configured parcel size ${sqmToHaRounded(maximumParcelSizeSqm)}ha`,
        explanations
      }
    }

    return {
      name,
      passed: true,
      description: rule.description,
      reason: `The parcel size is of acceptable size`,
      explanations
    }
  }
}
