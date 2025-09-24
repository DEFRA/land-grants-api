/* eslint-disable camelcase */

/**
 * Get compatibility matrix
 * @param {object} cm - db compatibility matrix
 * @returns {import("../compatibility-matrix.d.js").CompatibilityMatrix}
 */
export function compatibilityMatrixTransformer(cm) {
  return {
    id: cm.id,
    optionCode: cm.option_code,
    optionCodeCompat: cm.option_code_compat,
    year: cm.year
  }
}
