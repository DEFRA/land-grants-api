/** @type {RuleCheck} */
export function check(application) {
  const intersection = application.landParcel.intersections?.moorland
  const passed = intersection ? intersection > 0 : false

  if (!passed) {
    return {
      passed,
      message: 'Land parcel is above the moorland line'
    }
  }

  return {
    passed
  }
}

/**
 * @import { Rule, RuleCheck } from '../rulesEngine.d.js'
 */

/**
 * @type {Rule}
 */
export const isBelowMoorlandLine = { check, requiredDataLayers: ['moorland'] }
