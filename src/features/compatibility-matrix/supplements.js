import { SUPPLEMENT_BASE_TYPE } from './constants/compatibility-types.js'

/**
 * Finds the actions that are a base for at least one supported supplement action.
 * @param {CompatibilityMatrix[]} compatibilityMatrix - The latest year's compatibility matrix rows
 * @param {string[]} supportedActionCodes - The action codes we currently support (all enabled actions, including supplemental only)
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
 * The base actions of each supplement.
 * @param {CompatibilityMatrix[]} compatibilityMatrix - The latest year's compatibility matrix rows
 * @returns {Map<string, Set<string>>} The codes of each supplement's base actions, by supplement code
 */
export const getBaseCodesBySupplement = (compatibilityMatrix) => {
  const baseCodesBySupplement = new Map()

  for (const row of compatibilityMatrix) {
    if (row.type === SUPPLEMENT_BASE_TYPE) {
      const baseCodes =
        baseCodesBySupplement.get(row.optionCodeCompat) ?? new Set()
      baseCodes.add(row.optionCode)
      baseCodesBySupplement.set(row.optionCodeCompat, baseCodes)
    }
  }

  return baseCodesBySupplement
}

/**
 * @import { CompatibilityMatrix } from './compatibility-matrix.d.js'
 */
