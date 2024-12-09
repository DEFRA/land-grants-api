/**
 * @param {Application} application
 * @param {NoIntersectionWithLayerRuleConfig} ruleConfig
 * @returns {RuleResponse}
 */
export function noIntersectionWithLayer(application, ruleConfig) {
  const { intersections } = application.landParcel
  const { layerId, tolerancePercentage } = ruleConfig

  if (
    intersections[layerId] != null &&
    intersections[layerId] > tolerancePercentage
  ) {
    return { passed: false }
  }

  return { passed: true }
}

/**
 * @typedef NoIntersectionWithLayerRuleConfig
 * @property {LayerId} layerId
 * @property {number} tolerancePercentage
 */

/** @import { RuleResponse, Application, LayerId } from '../rulesEngine.d.js' */
