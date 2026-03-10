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
    )
  ])
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
      shineResult
    ] = await runStatsQuery(client)

    const actionsCount = actionsResult.rows[0].count
    const actionsConfigCount = actionsConfigResult.rows[0].count
    const agreementsCount = agreementsResult.rows[0].count
    const applicationResultsCount = applicationResultsResult.rows[0].count
    const compatibilityMatrixCount = compatibilityMatrixResult.rows[0].count
    const landCoverCodesCount = landCoverCodesResult.rows[0].count
    const landCoverCodesActionsCount = landCoverCodesActionsResult.rows[0].count
    const landCoversCount = landCoversResult.rows[0].count
    const landParcelsCount = landParcelsResult.rows[0].count
    const sssiCount = sssiResults.rows[0].count
    const moorlandDesignationsCount = moorlandDesignationResult.rows[0].count
    const registeredParksGardensCount =
      registeredParksGardensResult.rows[0].count
    const registeredBattlefieldsCount =
      registeredBattlefieldsResult.rows[0].count
    const scheduledMonumentsCount = scheduledMonumentsResult.rows[0].count
    const shineCount = shineResult.rows[0].count

    logInfo(logger, {
      category: 'database',
      message: 'Get stats',
      context: {
        actionsCount,
        actionsConfigCount,
        agreementsCount,
        applicationResultsCount,
        compatibilityMatrixCount,
        landCoverCodesCount,
        landCoverCodesActionsCount,
        landCoversCount,
        landParcelsCount,
        sssiCount,
        moorlandDesignationsCount,
        registeredParksGardensCount,
        registeredBattlefieldsCount,
        scheduledMonumentsCount,
        shineCount
      }
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
