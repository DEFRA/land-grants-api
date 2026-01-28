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

    const explanations = [
      {
        title: `${layerName} check`,
        lines: []
      }
    ]
    let caveat = null

    if (application?.landParcel?.intersections?.[layerName] == null) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `An intersection with the ${layerName} layer was not provided in the application data`,
        explanations
      }
    }

    const { intersectingAreaPercentage, intersectionAreaHa } =
      application.landParcel.intersections?.[layerName]

    const isConsentRequired =
      intersectingAreaPercentage != null &&
      intersectingAreaPercentage - tolerancePercent > 0

    if (isConsentRequired) {
      caveat = {
        code: rule.name,
        description: caveatDescription,
        metadata: {
          percentageOverlap: intersectingAreaPercentage,
          overlapAreaHectares: intersectionAreaHa
        }
      }
    }

    explanations[0].lines.push(
      // @ts-expect-error - lines
      `This parcel has a ${intersectingAreaPercentage}% intersection with the sssi layer. The tolerance is ${tolerancePercent}%.`
    )

    return {
      name,
      passed: !isConsentRequired,
      reason: isConsentRequired
        ? caveatDescription
        : caveatDescription.replace('A', 'No'),
      description: rule.description,
      explanations,
      ...(caveat && { caveat })
    }
  }
}
