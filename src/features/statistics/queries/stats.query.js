import { logDatabaseError } from '../../common/helpers/logging/log-helpers.js'

const statsSql = [
  'SELECT COUNT(*) AS actionsCount FROM actions',
  'SELECT COUNT(*) AS actionsConfigCount FROM actions_config',
  'SELECT COUNT(*) AS agreementsCount FROM agreements',
  'SELECT COUNT(*) AS applicationResultsCount FROM application_results',
  'SELECT COUNT(*) AS compatibilityMatrixCount FROM compatibility_matrix',
  'SELECT COUNT(*) AS landCoverCodesCount FROM land_cover_codes',
  'SELECT COUNT(*) AS landCoverCodesActionsCount FROM land_cover_codes_actions',
  'SELECT COUNT(*) AS landCoversCount FROM land_covers',
  'SELECT COUNT(*) AS landParcelsCount FROM land_parcels',
  'SELECT COUNT(*) AS sssiCount FROM data_layer WHERE data_layer_type_id = 1',
  'SELECT COUNT(*) AS moorlandDesignationsCount FROM data_layer WHERE data_layer_type_id = 2',
  "SELECT COUNT(*) AS registeredParksGardensCount FROM data_layer WHERE data_layer_type_id = 3 AND (metadata->>'type') = 'registered_parks_gardens'",
  "SELECT COUNT(*) AS registeredBattlefieldsCount FROM data_layer WHERE data_layer_type_id = 3 AND (metadata->>'type') = 'registered_battlefields'",
  "SELECT COUNT(*) AS scheduledMonumentsCount FROM data_layer WHERE data_layer_type_id = 3 AND (metadata->>'type') = 'scheduled_monuments'",
  "SELECT COUNT(*) AS shineCount FROM data_layer WHERE data_layer_type_id = 3 AND (metadata->>'type') = 'shine'",
  'SELECT COUNT(*) AS uniqueParcelsCount FROM (SELECT DISTINCT sheet_id, parcel_id FROM land_parcels) sub',
  'SELECT COUNT(*) AS uniqueCoversCount FROM (SELECT DISTINCT sheet_id, parcel_id FROM land_covers) sub',
  'SELECT COUNT(*) AS duplicateCoversCount FROM (SELECT 1 FROM land_covers GROUP BY parcel_id, sheet_id, land_cover_class_code, geom HAVING COUNT(*) > 1) t',
  'SELECT COUNT(*) AS unlinkedParcelsCount FROM land_parcels p WHERE NOT EXISTS (SELECT 1 FROM land_covers c WHERE c.sheet_id = p.sheet_id AND c.parcel_id = p.parcel_id)',
  'SELECT COUNT(*) AS unlinkedCoversCount FROM land_covers c WHERE NOT EXISTS (SELECT 1 FROM land_parcels p WHERE c.sheet_id = p.sheet_id AND c.parcel_id = p.parcel_id)'
]

// Run all counts as individual queries in parallel using Promise.all.
const runStatsQuery = async (client) => {
  const results = await Promise.all(statsSql.map((sql) => client.query(sql)))

  // merge returned rows; do not set defaults — only include returned columns
  /** @type {Record<string, string | number>} */
  const stats = results.reduce(
    (acc, res) => ({
      ...acc,
      ...(Array.isArray(res?.rows) ? res.rows[0] : {})
    }),
    {}
  )

  return stats
}

/**
 * Get stats
 * @param {Logger} logger - The logger
 * @param {Pool} db - The postgres instance
 * @returns {Promise<Record<string, string | number> | undefined>} The stats
 */
async function getStats(logger, db) {
  let client
  try {
    client = await db.connect()
    return await runStatsQuery(client)
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get stats failed',
      error
    })
    return undefined
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { getStats }

/**
 * @import {Logger} from '~/src/features/common/logger.d.js'
 * @import {Pool} from '~/src/features/common/postgres.d.js'
 */
