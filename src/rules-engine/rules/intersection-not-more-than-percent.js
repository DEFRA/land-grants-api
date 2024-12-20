/** @type {(layerId: LayerId) => RuleCheck} */
export const makeCheck =
  (layerId) =>
  /** @type {(application: Application, ruleConfig: {maxIntersectionPercent: number}) => RuleCheckResult} */
  (application, { maxIntersectionPercent }) => {
    const intersection = application.landParcel.intersections?.[layerId]

    if (intersection == null) {
      return {
        passed: false,
        message: `An intersection with the ${layerId} layer was not provided in the application data`
      }
    }

    const isLessThanOrEqualToMax =
      intersection.intersectingAreaPercentage <= maxIntersectionPercent

    return isLessThanOrEqualToMax
      ? { passed: true }
      : {
          passed: false,
          message: `The parcel has a ${intersection.intersectingAreaPercentage}% intersection with the ${layerId} layer, the maximum is ${maxIntersectionPercent}%`
        }
  }

/**
 * @import {LayerId, Rule, RuleCheck} from '../rulesEngine.d.js'
 */

/**
 * @type {(layerId: LayerId) => Rule}
 */
export const intersectionNotMoreThanPercent = (layerId) => ({
  check: makeCheck(layerId),
  requiredDataLayers: [layerId]
})
