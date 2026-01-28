/**
 * @import { RuleEngineApplication, RuleResultItem } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/api/actions/action.d.js'
 */

/**
 * @param {RuleEngineApplication} application - The application to execute the rule on
 * @param {ActionRule} rule - The rule to execute
 * @returns {RuleResultItem} - The result of the rule
 */
export const parcelHasIntersectionWithDataLayer = {
  execute: (application, rule) => {
    const { layerName, minimumIntersectionPercent, tolerancePercent } =
      rule.config
    const name = `${rule.name}-${layerName}`
    const intersection = application.landParcel.intersections?.[layerName]

    const explanations = [
      {
        title: `${layerName} check`,
        lines: []
      }
    ]

    if (intersection == null) {
      explanations[0].lines.push(
        // @ts-expect-error - lines
        `An intersection with the ${layerName} layer was not provided in the application data`
      )
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `An intersection with the ${layerName} layer was not provided in the application data`,
        explanations
      }
    }

    const isGreaterThanOrEqualToMin =
      intersection.intersectingAreaPercentage >=
      minimumIntersectionPercent - tolerancePercent

    explanations[0].lines.push(
      // @ts-expect-error - lines
      `This parcel has a ${intersection.intersectingAreaPercentage}% intersection with the ${layerName} layer. The target is ${minimumIntersectionPercent + tolerancePercent}%.`
    )

    return {
      name,
      passed: isGreaterThanOrEqualToMin,
      reason: `This parcel is ${isGreaterThanOrEqualToMin ? 'majority' : 'not majority'} on the ${layerName}`,
      description: rule.description,
      explanations
    }
  }
}
