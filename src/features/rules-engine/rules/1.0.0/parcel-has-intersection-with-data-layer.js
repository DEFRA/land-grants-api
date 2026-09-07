/**
 * @import { RuleEngineApplication, RuleResultItem, RuleExecutor } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 */

/**
 * Builds a layer-specific "parcel has a minimum intersection with <layer>" rule.
 * The layer is baked into the rule so it never appears in the action config, and
 * the rule declares its own data requirement. The minimum/tolerance/failureMessage
 * remain per-action config.
 * @param {string} layer - The data layer name (e.g. 'moorland')
 * @returns {RuleExecutor}
 */
const makeParcelHasIntersection = (layer) => ({
  requires: [{ type: 'intersection', layer }],
  execute: (application, rule) => {
    const { minimumIntersectionPercent, tolerancePercent, failureMessage } =
      rule.config
    const name = rule.name
    const intersection = application.landParcel.intersections?.[layer]

    const explanations = [
      {
        title: `${layer} check`,
        lines: []
      }
    ]

    if (intersection == null) {
      explanations[0].lines.push(
        // @ts-expect-error - lines
        `An intersection with the ${layer} layer was not provided in the application data`
      )
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `An intersection with the ${layer} layer was not provided in the application data`,
        explanations
      }
    }

    const isGreaterThanOrEqualToMin =
      intersection.intersectingAreaPercentage >=
      minimumIntersectionPercent - tolerancePercent

    explanations[0].lines.push(
      // @ts-expect-error - lines
      `This parcel has a ${intersection.intersectingAreaPercentage}% intersection with the ${layer} layer. The target is ${minimumIntersectionPercent - tolerancePercent}%.`
    )

    const majorityStatus = isGreaterThanOrEqualToMin
      ? 'majority'
      : 'not majority'

    return {
      name,
      passed: isGreaterThanOrEqualToMin,
      reason:
        !isGreaterThanOrEqualToMin && failureMessage
          ? failureMessage
          : `This parcel is ${majorityStatus} on the ${layer}`,
      description: rule.description,
      explanations
    }
  }
})

export const parcelHasMoorlandIntersection =
  makeParcelHasIntersection('moorland')
export const parcelHasLfaIntersection = makeParcelHasIntersection('lfa')
export const parcelHasSssiIntersection = makeParcelHasIntersection('sssi')
