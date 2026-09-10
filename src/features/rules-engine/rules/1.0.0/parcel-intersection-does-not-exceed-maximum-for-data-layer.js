/**
 * @import { RuleEngineApplication, RuleResultItem, RuleExecutor } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 */

/**
 * Builds a layer-specific "parcel intersection with <layer> does not exceed a maximum"
 * rule. The layer is baked in (so it never appears in the action config) and the rule
 * declares its own data requirement; the maximum/tolerance remain per-action config.
 * @param {string} layer - The data layer name (e.g. 'moorland')
 * @returns {RuleExecutor}
 */
const makeParcelWithinMaxIntersection = (layer) => ({
  requires: [{ type: 'intersection', layer }],
  execute: (application, rule) => {
    const { tolerancePercent, maximumIntersectionPercent } = rule.config
    const configuredTolerancePercent = tolerancePercent ?? 0
    const configuredMaximumIntersectionPercent = maximumIntersectionPercent ?? 0
    const maximumAllowedIntersectionPercent =
      configuredMaximumIntersectionPercent + configuredTolerancePercent
    const name = rule.name
    const intersection = application.landParcel?.intersections?.[layer]

    const explanations = [
      {
        title: `${layer} check`,
        lines: []
      }
    ]

    if (intersection == null) {
      const reason = `An intersection with the ${layer} layer was not provided in the application data`
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
      `This parcel has a ${intersection.intersectingAreaPercentage}% intersection with the ${layer} layer. The target is ${maximumAllowedIntersectionPercent}%.`
    )

    return {
      name,
      passed: isWithinMaximumAllowedIntersection,
      reason: `This parcel ${isWithinMaximumAllowedIntersection ? 'is within' : 'exceeds'} the maximum allowed intersection with the ${layer} layer`,
      description: rule.description,
      explanations
    }
  }
})

export const parcelWithinMaxMoorlandIntersection =
  makeParcelWithinMaxIntersection('moorland')
