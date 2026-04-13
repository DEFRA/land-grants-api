/**
 * @import { RuleEngineApplication, RuleResultItem } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 */

/**
 * @param {RuleEngineApplication} application - The application to execute the rule on
 * @param {ActionRule} rule - The rule to execute
 * @returns {RuleResultItem} - The result of the rule
 */
export const parcelIntersectionDoesNotExceedMaximumForDataLayer = {
  execute: (application, rule) => {
    const { layerName, tolerancePercent, maximumIntersectionPercent } =
      rule.config
    const configuredTolerancePercent = tolerancePercent ?? 0
    const configuredMaximumIntersectionPercent = maximumIntersectionPercent ?? 0
    const maximumAllowedIntersectionPercent =
      configuredMaximumIntersectionPercent + configuredTolerancePercent
    const name = `${rule.name}-${layerName}`
    const intersection = application.landParcel.intersections?.[layerName]

    const explanations = [
      {
        title: `${layerName} check`,
        lines: []
      }
    ]

    if (intersection == null) {
      const reason = `An intersection with the ${layerName} layer was not provided in the application data`
      // @ts-expect-error - lines
      explanations[0].lines.push(reason)
      return {
        name,
        passed: false,
        description: rule.description,
        reason,
        explanations
      }
    }

    const isWithinMaximumAllowedIntersection =
      intersection.intersectingAreaPercentage <=
      maximumAllowedIntersectionPercent

    explanations[0].lines.push(
      // @ts-expect-error - lines
      `This parcel has a ${intersection.intersectingAreaPercentage}% intersection with the ${layerName} layer. The target is ${maximumAllowedIntersectionPercent}%.`
    )

    return {
      name,
      passed: isWithinMaximumAllowedIntersection,
      reason: `This parcel ${isWithinMaximumAllowedIntersection ? 'is within' : 'exceeds'} the maximum allowed intersection with the ${layerName} layer`,
      description: rule.description,
      explanations
    }
  }
}
