/**
 * @import { Action, AvailableAreaDataRequirements } from './available-area.d.js'
 * @import { LandCover } from '~/src/features/parcel/parcel.d.js'
 * @import { Pool } from '~/src/features/common/postgres.d.js'
 * @import { Logger } from '~/src/features/common/logger.d.js'
 */

import { getLandCoverDefinitions } from '~/src/features/land-cover-codes/queries/getLandCoverDefinitions.query.js'
import {
  getLandCoversForAction,
  getLandCoversForActions
} from '~/src/features/land-cover-codes/queries/getLandCoversForActions.query.js'
import { getLandCoversForParcel } from '~/src/features/parcel/queries/getLandCoversForParcel.query.js'
import { createLandCoverCodeToString } from '~/src/features/land-cover-codes/services/createLandCoverCodeToString.js'
import { getLandCoverIntersections } from '~/src/features/land-covers/queries/getLandCoverIntersections.query.js'
import { getActionEligibilty } from '~/src/features/actions/queries/getActionEligibilty.query.js'

/**
 * Fetches the land cover codes for the action being applied for, the land covers for the parcel,
 * and the land covers for existing actions.
 * @param {string} actionCodeAppliedFor - The action code being applied for
 * @param {string} sheetId - The sheet ID of the parcel
 * @param {string} parcelId - The parcel ID
 * @param {Action[]} existingActions - The list of existing actions
 * @param {Pool} postgresDb - The Postgres database connection
 * @param {Logger} logger - The logger object
 * @returns {Promise<AvailableAreaDataRequirements>} - An object containing land cover codes for the action, land covers for the parcel, and land covers for existing actions
 */
export async function getAvailableAreaDataRequirements(
  actionCodeAppliedFor,
  sheetId,
  parcelId,
  existingActions,
  postgresDb,
  logger
) {
  const landCoverCodesForAppliedForAction = await getLandCoversForAction(
    actionCodeAppliedFor,
    postgresDb,
    logger
  )

  const landCoversForParcel = await getLandCoversForParcel(
    sheetId,
    parcelId,
    postgresDb,
    logger
  )

  const landCoversForExistingActions = await getLandCoversForActions(
    existingActions.map((a) => a.actionCode),
    postgresDb,
    logger
  )

  const landCoverCodesForExistingActions = Object.keys(
    landCoversForExistingActions
  ).flatMap((k) => landCoversForExistingActions[k].map((c) => c.landCoverCode))

  const allLandCoverCodes = new Set([
    ...landCoverCodesForAppliedForAction.map((c) => c.landCoverCode),
    ...landCoversForParcel.map((c) => c.landCoverClassCode),
    ...landCoverCodesForExistingActions
  ])

  const landCoverDefinitions = await getLandCoverDefinitions(
    Array.from(allLandCoverCodes),
    postgresDb,
    logger
  )

  const landCoverToString = createLandCoverCodeToString(landCoverDefinitions)

  const aggregatedLandCovers = aggregateLandCovers(landCoversForParcel)

  const { sssiOverlap, hfOverlap, sssiAndHfOverlap } =
    await getLandCoverIntersections(sheetId, parcelId, postgresDb, logger)

  const actionEligibilty = await getActionEligibilty(logger, postgresDb)

  const sssiActionEligibility = actionEligibilty.reduce((acc, curr) => {
    acc[curr.code] = curr.sssi_eligible
    return acc
  }, {})

  const hfActionEligibility = actionEligibilty.reduce((acc, curr) => {
    acc[curr.code] = curr.hf_eligible
    return acc
  }, {})

  return {
    landCoverCodesForAppliedForAction,
    landCoversForParcel: aggregatedLandCovers,
    landCoversForExistingActions,
    landCoverToString,
    sssiOverlap,
    hfOverlap,
    sssiAndHfOverlap,
    sssiActionEligibility,
    hfActionEligibility
  }
}

/**
 * Sums land cover areas that share the same class code. A parcel may have
 * many separate patches of the same land cover class; aggregating them
 * reduces the number of entries the AAC needs to process.
 * @param {LandCover[]} landCovers
 * @returns {LandCover[]}
 */
export function aggregateLandCovers(landCovers) {
  /** @type {Map<string, number>} */
  const grouped = new Map()
  for (const landCover of landCovers) {
    grouped.set(
      landCover.landCoverClassCode,
      (grouped.get(landCover.landCoverClassCode) ?? 0) + landCover.areaSqm
    )
  }
  return Array.from(grouped.entries()).map(([landCoverClassCode, areaSqm]) => ({
    landCoverClassCode,
    areaSqm
  }))
}
