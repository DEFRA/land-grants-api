/**
 * @param {Application} application
 * @param {NoIntersectionWithLayerRuleConfig} ruleConfig
 * @returns {RuleResponse}
 */
export function check(application, ruleConfig) {
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
 * @type {import('../../types.js').Rule}
 */
export const noIntersectionWithLayer = { check, requiredDataLayers: [] }

/**
 * @typedef NoIntersectionWithLayerRuleConfig
 * @property {LayerId} layerId
 * @property {number} tolerancePercentage
 */

/** @import { RuleResponse, Application, LayerId } from '../rulesEngine.d.js' */
