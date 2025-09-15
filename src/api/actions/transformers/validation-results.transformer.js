/**
 *
 * @param {ValidationResult} validationResult
 * @returns {{code: string, description: string, sheetId: string, parcelId: string, passed: boolean}}
 */
export const mapRuleResult = (validationResult) => {
  return {
    code: validationResult.code,
    description: validationResult.description,
    sheetId: validationResult.sheetId,
    parcelId: validationResult.parcelId,
    passed: validationResult.passed
  }
}

/**
 * @import { ValidationResult } from '~/src/api/common/common.d.js'
 */
