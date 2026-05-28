import {
  logDatabaseError,
  logInfo
} from '../../common/helpers/logging/log-helpers.js'

const runStatsQuery = async (client) => {
  return await Promise.all([
    client.query(`SELECT COUNT(*) FROM actions`),
    client.query(`SELECT COUNT(*) FROM actions_config`),
    client.query(`SELECT COUNT(*) FROM agreements`),
    client.query(`SELECT COUNT(*) FROM application_results`),
    client.query(`SELECT COUNT(*) FROM compatibility_matrix`),
    client.query(`SELECT COUNT(*) FROM land_cover_codes`),
    client.query(`SELECT COUNT(*) FROM land_cover_codes_actions`),
    client.query(`SELECT COUNT(*) FROM land_covers`),
    client.query(`SELECT COUNT(*) FROM land_parcels`),
    client.query(
      `SELECT COUNT(*) FROM data_layer WHERE data_layer_type_id = 1`
    ),
    client.query(
      `SELECT COUNT(*) FROM data_layer WHERE data_layer_type_id = 2`
    ),
    client.query(
      `SELECT COUNT(*) FROM data_layer WHERE data_layer_type_id = 3 and (metadata->>'type') = 'registered_parks_gardens'`
    ),
    client.query(
      `SELECT COUNT(*) FROM data_layer WHERE data_layer_type_id = 3 and (metadata->>'type') = 'registered_battlefields'`
    ),
    client.query(
      `SELECT COUNT(*) FROM data_layer WHERE data_layer_type_id = 3 and (metadata->>'type') = 'scheduled_monuments'`
    ),
    client.query(
      `SELECT COUNT(*) FROM data_layer WHERE data_layer_type_id = 3 and (metadata->>'type') = 'shine'`
    ),
    client.query(
      `SELECT COUNT(DISTINCT (sheet_id, parcel_id)) AS count FROM land_parcels`
    ),
    client.query(
      `SELECT COUNT(DISTINCT (sheet_id, parcel_id)) AS count FROM land_covers`
    ),
    client.query(
      `SELECT COUNT(*) FROM (SELECT 1 FROM land_covers GROUP BY parcel_id, sheet_id, land_cover_class_code, geom HAVING COUNT(*) > 1)`
    )
  ])
}

/**
 * Extract a count value from a SQL query result.
 * @param {{ rows: Array<{ count: string | number }> }} result - Query result containing a count in the first row.
 * @returns {string | number} The count value from the query result.
 */
const getCountFromResult = (result) => result.rows[0].count

/**
 * Build a stats object from the stats query results.
 * @param {Array<{ rows: Array<{ count: string | number }> }>} results - Ordered query results from runStatsQuery.
 * @returns {Record<string, string | number>} Named stats values for logging.
 */
const mapStatsResults = (results) => {
  const [
    actionsResult,
    actionsConfigResult,
    agreementsResult,
    applicationResultsResult,
    compatibilityMatrixResult,
    landCoverCodesResult,
    landCoverCodesActionsResult,
    landCoversResult,
    landParcelsResult,
    sssiResults,
    moorlandDesignationResult,
    registeredParksGardensResult,
    registeredBattlefieldsResult,
    scheduledMonumentsResult,
    shineResult,
    uniqueParcelsResult,
    uniqueCoversResult,
    duplicateCoversResult
  ] = results

  return {
    actionsCount: getCountFromResult(actionsResult),
    actionsConfigCount: getCountFromResult(actionsConfigResult),
    agreementsCount: getCountFromResult(agreementsResult),
    applicationResultsCount: getCountFromResult(applicationResultsResult),
    compatibilityMatrixCount: getCountFromResult(compatibilityMatrixResult),
    landCoverCodesCount: getCountFromResult(landCoverCodesResult),
    landCoverCodesActionsCount: getCountFromResult(landCoverCodesActionsResult),
    landCoversCount: getCountFromResult(landCoversResult),
    landParcelsCount: getCountFromResult(landParcelsResult),
    sssiCount: getCountFromResult(sssiResults),
    moorlandDesignationsCount: getCountFromResult(moorlandDesignationResult),
    registeredParksGardensCount: getCountFromResult(
      registeredParksGardensResult
    ),
    registeredBattlefieldsCount: getCountFromResult(
      registeredBattlefieldsResult
    ),
    scheduledMonumentsCount: getCountFromResult(scheduledMonumentsResult),
    shineCount: getCountFromResult(shineResult),
    uniqueParcelsCount: getCountFromResult(uniqueParcelsResult),
    uniqueCoversCount: getCountFromResult(uniqueCoversResult),
    duplicateCoversCount: getCountFromResult(duplicateCoversResult)
  }
}

/**
 * Get stats
 * @param {Logger} logger - The logger
 * @param {Pool} db - The postgres instance
 * @returns {Promise<void>} The action configs
 */
async function getStats(logger, db) {
  let client
  try {
    client = await db.connect()
    const stats = mapStatsResults(await runStatsQuery(client))

    logInfo(logger, {
      category: 'database',
      message: 'Get stats',
      context: stats
    })
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get stats failed',
      error
    })
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
