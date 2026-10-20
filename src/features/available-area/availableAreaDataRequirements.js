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
import { getActionEligibility } from '~/src/features/actions/queries/getActionEligibility.query.js'

/**
 * Fetches through the request's cache when the caller supplies one, so data that is
 * the same for every action on a parcel is fetched once per request.
 * @template T
 * @param {Map<string, Promise<unknown>> | undefined} cache - Fetches shared across the request's actions
 * @param {string} key - The cache key
 * @param {() => Promise<T>} fetch - Fetches the data
 * @returns {Promise<T>} The fetched data
 */
function fetchOnce(cache, key, fetch) {
  if (!cache) {
    return fetch()
  }
  if (!cache.has(key)) {
    cache.set(key, fetch())
  }
  return /** @type {Promise<T>} */ (cache.get(key))
}

/**
 * Fetches the land cover codes for the action being applied for, the land covers for the parcel,
 * and the land covers for existing actions.
 * @param {string} actionCodeAppliedFor - The action code being applied for
 * @param {string} sheetId - The sheet ID of the parcel
 * @param {string} parcelId - The parcel ID
 * @param {Action[]} existingActions - The list of existing actions
 * @param {Pool} postgresDb - The Postgres database connection
 * @param {Logger} logger - The logger object
 * @param {Map<string, Promise<unknown>>} [cache] - Parcel data shared across the actions of one request
 * @returns {Promise<AvailableAreaDataRequirements>} - An object containing land cover codes for the action, land covers for the parcel, and land covers for existing actions
 */
export async function getAvailableAreaDataRequirements(
  actionCodeAppliedFor,
  sheetId,
  parcelId,
  existingActions,
  postgresDb,
  logger,
  cache
) {
  const [
    landCoverCodesForAppliedForAction,
    landCoversForParcel,
    landCoversForExistingActions,
    { sssiOverlap, hfOverlap, sssiAndHfOverlap },
    actionEligibility
  ] = await Promise.all([
    getLandCoversForAction(actionCodeAppliedFor, postgresDb, logger),
    fetchOnce(cache, `landCoversForParcel:${sheetId}-${parcelId}`, () =>
      getLandCoversForParcel(sheetId, parcelId, postgresDb, logger)
    ),
    getLandCoversForActions(
      existingActions.map((a) => a.actionCode),
      postgresDb,
      logger
    ),
    fetchOnce(cache, `landCoverIntersections:${sheetId}-${parcelId}`, () =>
      getLandCoverIntersections(sheetId, parcelId, postgresDb, logger)
    ),
    fetchOnce(cache, 'actionEligibility', () =>
      getActionEligibility(logger, postgresDb)
    )
  ])

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

  const sssiActionEligibility = createActionEligibilityMap(
    actionEligibility,
    'sssi_eligible'
  )

  const hfActionEligibility = createActionEligibilityMap(
    actionEligibility,
    'hf_eligible'
  )

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
function aggregateLandCovers(landCovers) {
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

/**
 * Builds an eligibility lookup keyed by action code.
 * @param {{ code: string, [key: string]: unknown }[]} actionEligibility
 * @param {string} eligibilityKey
 * @returns {Record<string, boolean>}
 */
function createActionEligibilityMap(actionEligibility, eligibilityKey) {
  return actionEligibility.reduce((acc, curr) => {
    acc[curr.code] = Boolean(curr[eligibilityKey])
    return acc
  }, {})
}
