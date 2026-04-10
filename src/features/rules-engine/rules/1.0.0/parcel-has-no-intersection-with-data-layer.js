/**
 * @import { RuleEngineApplication, RuleResultItem } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 */

/**
 * @param {RuleEngineApplication} application - The application to execute the rule on
 * @param {ActionRule} rule - The rule to execute
 * @returns {RuleResultItem} - The result of the rule
 */
export const parcelHasNoIntersectionWithDataLayer = {
  execute: (application, rule) => {
    const { layerName } = rule.config
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

    const hasNoIntersection = intersection.intersectingAreaPercentage === 0

    explanations[0].lines.push(
      // @ts-expect-error - lines
      `This parcel has a ${intersection.intersectingAreaPercentage}% intersection with the ${layerName} layer. The target is 0%.`
    )

    return {
      name,
      passed: hasNoIntersection,
      reason: `This parcel ${hasNoIntersection ? 'has no' : 'has an'} intersection with the ${layerName} layer`,
      description: rule.description,
      explanations
    }
  }
}
