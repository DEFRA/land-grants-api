/**
 * @import { RuleEngineApplication, RuleResultItem } from '~/src/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/api/actions/action.d.js'
 */

/**
 * @param {RuleEngineApplication} application - The application to execute the rule on
 * @param {ActionRule} rule - The rule to execute
 * @returns {RuleResultItem} - The result of the rule
 */
export const sssiConsentRequired = {
  execute: (application, rule) => {
    const { layerName, caveatDescription, tolerancePercent } = rule.config
    const name = `${rule.name}-${layerName}`
    const intersection = application.landParcel.intersections?.[layerName]

    const explanations = [
      {
        title: `${layerName} check`,
        lines: []
      }
    ]

    const isConsentRequired =
      intersection != null &&
      intersection.intersectingAreaPercentage - tolerancePercent > 0

    explanations[0].lines.push(
      // @ts-expect-error - lines
      `This parcel has a ${intersection.intersectingAreaPercentage}% intersection with the ${layerName} layer. The tolerance is ${tolerancePercent}%.`
    )

    return {
      name,
      passed: true,
      reason: !isConsentRequired
        ? caveatDescription
        : caveatDescription.replace('A', 'No'),
      description: rule.description,
      explanations,
      cavets: {
        isConsentRequired
      }
    }
  }
}
