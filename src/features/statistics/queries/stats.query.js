import { logDatabaseError } from '../../common/helpers/logging/log-helpers.js'

const runStatsQuery = async (client) => {
  const sql = `SELECT
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
    (SELECT COUNT(*) FROM data_layer WHERE data_layer_type_id = 3 AND (metadata->>'type') = 'shine') AS "shineCount",
    (SELECT COUNT(*) FROM (SELECT DISTINCT sheet_id, parcel_id FROM land_parcels) sub) AS "uniqueParcelsCount",
    (SELECT COUNT(*) FROM (SELECT DISTINCT sheet_id, parcel_id FROM land_covers) sub) AS "uniqueCoversCount",
    (SELECT COUNT(*) FROM (SELECT 1 FROM land_covers GROUP BY parcel_id, sheet_id, land_cover_class_code, geom HAVING COUNT(*) > 1) t) AS "duplicateCoversCount",
    (SELECT COUNT(*) FROM land_parcels p WHERE NOT EXISTS (SELECT 1 FROM land_covers c WHERE c.sheet_id = p.sheet_id AND c.parcel_id = p.parcel_id)) AS "unlinkedParcelsCount",
    (SELECT COUNT(*) FROM land_covers c WHERE NOT EXISTS (SELECT 1 FROM land_parcels p WHERE c.sheet_id = p.sheet_id AND c.parcel_id = p.parcel_id)) AS "unlinkedCoversCount"
  `

  const result = await client.query(sql)

  return result?.rows?.[0] || {}
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
