import { logDatabaseError } from '../../common/helpers/logging/log-helpers.js'

// Run lightweight combined counts in one query, and run heavy counts concurrently
// via the pool to allow DB-side parallelism (multiple connections).
const runStatsQuery = async (db) => {
  const quickSql = `SELECT
    (SELECT COUNT(*) FROM actions) AS "actionsCount",
    (SELECT COUNT(*) FROM actions_config) AS "actionsConfigCount",
    (SELECT COUNT(*) FROM agreements) AS "agreementsCount",
    (SELECT COUNT(*) FROM application_results) AS "applicationResultsCount",
    (SELECT COUNT(*) FROM compatibility_matrix) AS "compatibilityMatrixCount",
    (SELECT COUNT(*) FROM land_cover_codes) AS "landCoverCodesCount",
    (SELECT COUNT(*) FROM land_cover_codes_actions) AS "landCoverCodesActionsCount",
    (SELECT COUNT(*) FROM land_covers) AS "landCoversCount",
    (SELECT COUNT(*) FROM land_parcels) AS "landParcelsCount",
    (SELECT COUNT(*) FROM data_layer WHERE data_layer_type_id = 1) AS "sssiCount",
    (SELECT COUNT(*) FROM data_layer WHERE data_layer_type_id = 2) AS "moorlandDesignationsCount",
    (SELECT COUNT(*) FROM data_layer WHERE data_layer_type_id = 3 AND (metadata->>'type') = 'registered_parks_gardens') AS "registeredParksGardensCount",
    (SELECT COUNT(*) FROM data_layer WHERE data_layer_type_id = 3 AND (metadata->>'type') = 'registered_battlefields') AS "registeredBattlefieldsCount",
    (SELECT COUNT(*) FROM data_layer WHERE data_layer_type_id = 3 AND (metadata->>'type') = 'scheduled_monuments') AS "scheduledMonumentsCount",
    (SELECT COUNT(*) FROM data_layer WHERE data_layer_type_id = 3 AND (metadata->>'type') = 'shine') AS "shineCount"
  `

  // heavy queries that benefit from running on separate connections
  const uniqueParcelsSql = `SELECT COUNT(*)::bigint AS count FROM (SELECT DISTINCT sheet_id, parcel_id FROM land_parcels) sub`
  const uniqueCoversSql = `SELECT COUNT(*)::bigint AS count FROM (SELECT DISTINCT sheet_id, parcel_id FROM land_covers) sub`
  const duplicateCoversSql = `SELECT COUNT(*)::bigint AS count FROM (SELECT 1 FROM land_covers GROUP BY parcel_id, sheet_id, land_cover_class_code, geom HAVING COUNT(*) > 1) t`
  const unlinkedParcelsSql = `SELECT COUNT(*)::bigint AS count FROM land_parcels p WHERE NOT EXISTS (SELECT 1 FROM land_covers c WHERE c.sheet_id = p.sheet_id AND c.parcel_id = p.parcel_id)`
  const unlinkedCoversSql = `SELECT COUNT(*)::bigint AS count FROM land_covers c WHERE NOT EXISTS (SELECT 1 FROM land_parcels p WHERE c.sheet_id = p.sheet_id AND c.parcel_id = p.parcel_id)`

  const quickResult = await db.query(quickSql)

  // fire heavy queries concurrently using the pool (db.query) so the DB can
  // schedule them on separate worker connections.
  const heavyPromises = [
    db.query(uniqueParcelsSql),
    db.query(uniqueCoversSql),
    db.query(duplicateCoversSql),
    db.query(unlinkedParcelsSql),
    db.query(unlinkedCoversSql)
  ]

  const [
    uniqueParcelsRes,
    uniqueCoversRes,
    duplicateCoversRes,
    unlinkedParcelsRes,
    unlinkedCoversRes
  ] = await Promise.all(heavyPromises)

  const row = quickResult?.rows?.[0] || {}

  return {
    ...row,
    uniqueParcelsCount: uniqueParcelsRes?.rows?.[0]?.count ?? 0,
    uniqueCoversCount: uniqueCoversRes?.rows?.[0]?.count ?? 0,
    duplicateCoversCount: duplicateCoversRes?.rows?.[0]?.count ?? 0,
    unlinkedParcelsCount: unlinkedParcelsRes?.rows?.[0]?.count ?? 0,
    unlinkedCoversCount: unlinkedCoversRes?.rows?.[0]?.count ?? 0
  }
}

/**
 * Get stats
 * @param {Logger} logger - The logger
 * @param {Pool} db - The postgres instance
 * @returns {Promise<Record<string, string | number> | undefined>} The stats
 */
async function getStats(logger, db) {
  try {
    // Run against the pool so heavy queries can use separate connections.
    return await runStatsQuery(db)
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get stats failed',
      error
    })
    return undefined
  }
}

export { getStats }

/**
 * @import {Logger} from '~/src/features/common/logger.d.js'
 * @import {Pool} from '~/src/features/common/postgres.d.js'
 */
