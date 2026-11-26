import { getCompatibilityMatrix } from '~/src/features/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
import { LAND_SHARING_COMPATIBILITY_TYPES } from '~/src/features/compatibility-matrix/constants/compatibility-types.js'
import {
  getActionCodesWithSupplements,
  getBaseCodesBySupplement
} from '~/src/features/compatibility-matrix/supplements.js'

/**
 * Creates a compatibility checking function from compatibility matrix rows.
 * Two actions can overlap when any row relates them; the rows are read only
 * for the types under which actions share land (BASECO, SUPBAS and SUPCO).
 * @param {CompatibilityMatrix[]} compatibilityMatrices
 * @returns {(action1: string, action2: string) => boolean}
 */
const compatibilityCheckFromMatrix = (compatibilityMatrices) => {
  return (action1, action2) => {
    return compatibilityMatrices.some(
      (a) =>
        (a.optionCode === action2 && a.optionCodeCompat === action1) ||
        (a.optionCode === action1 && a.optionCodeCompat === action2)
    )
  }
}

/**
 * Reads the compatibility matrix once and builds the compatibility check and
 * the base actions of each supplement, for validating an application and for
 * listing the supplements of base actions.
 * @param {Logger} logger
 * @param {Pool} db
 * @returns {Promise<{ compatibilityCheckFn: (action1: string, action2: string) => boolean, baseCodesBySupplement: Map<string, Set<string>> }>}
 */
export const createValidationLookups = async (logger, db) => {
  const compatibilityMatrices = await getCompatibilityMatrix(
    logger,
    db,
    null,
    LAND_SHARING_COMPATIBILITY_TYPES
  )
  return {
    compatibilityCheckFn: compatibilityCheckFromMatrix(compatibilityMatrices),
    baseCodesBySupplement: getBaseCodesBySupplement(compatibilityMatrices)
  }
}

/**
 * Reads the compatibility matrix once and builds both the compatibility check
 * and the set of actions that have supplements.
 * @param {Logger} logger
 * @param {Pool} db
 * @param {string[]} supportedActionCodes - The action codes we currently support (all enabled actions, including supplemental only)
 * @returns {Promise<{ compatibilityCheckFn: (action1: string, action2: string) => boolean, actionCodesWithSupplements: Set<string> }>}
 */
export const createCompatibilityLookups = async (
  logger,
  db,
  supportedActionCodes
) => {
  const compatibilityMatrices = await getCompatibilityMatrix(
    logger,
    db,
    null,
    LAND_SHARING_COMPATIBILITY_TYPES
  )
  return {
    compatibilityCheckFn: compatibilityCheckFromMatrix(compatibilityMatrices),
    actionCodesWithSupplements: getActionCodesWithSupplements(
      compatibilityMatrices,
      supportedActionCodes
    )
  }
}

/**
 * @import { Logger } from '~/src/features/common/logger.d.js'
 * @import { Pool } from '~/src/features/common/postgres.d.js'
 * @import { CompatibilityMatrix } from '~/src/features/compatibility-matrix/compatibility-matrix.d.js'
 */
