// "First option is base for the second option" - the second option is a supplement of the first
const SUPPLEMENT_BASE_TYPE = 'SUPBAS'

/**
 * Finds the actions that are a base for at least one supported supplement action.
 * @param {CompatibilityMatrix[]} compatibilityMatrix - The latest year's compatibility matrix rows
 * @param {string[]} supportedActionCodes - The action codes we currently offer (enabled and displayed actions)
 * @returns {Set<string>} The codes of actions that have supplements
 */
export const getActionCodesWithSupplements = (
  compatibilityMatrix,
  supportedActionCodes
) => {
  const supported = new Set(supportedActionCodes)

  return new Set(
    compatibilityMatrix
      .filter(
        (row) =>
          row.type === SUPPLEMENT_BASE_TYPE &&
          supported.has(row.optionCodeCompat)
      )
      .map((row) => row.optionCode)
  )
}

/**
 * Finds the supported supplements of a base action.
 * @param {CompatibilityMatrix[]} compatibilityMatrix - The latest year's compatibility matrix rows
 * @param {string} baseActionCode - The base action
 * @param {string[]} supportedActionCodes - The action codes we currently support (enabled actions)
 * @returns {Set<string>} The codes of the base action's supplements
 */
export const getSupplementCodesForBase = (
  compatibilityMatrix,
  baseActionCode,
  supportedActionCodes
) => {
  const supported = new Set(supportedActionCodes)

  return new Set(
    compatibilityMatrix
      .filter(
        (row) =>
          row.type === SUPPLEMENT_BASE_TYPE &&
          row.optionCode === baseActionCode &&
          supported.has(row.optionCodeCompat)
      )
      .map((row) => row.optionCodeCompat)
  )
}

/**
 * @import { CompatibilityMatrix } from './compatibility-matrix.d.js'
 */
