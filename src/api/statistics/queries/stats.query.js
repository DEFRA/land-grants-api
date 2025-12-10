import {
  logDatabaseError,
  logInfo
} from '../../common/helpers/logging/log-helpers.js'
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

    const results = await Promise.all([
      client.query(`SELECT COUNT(*) FROM actions`),
      client.query(`SELECT COUNT(*) FROM actions_config`),
      client.query(`SELECT COUNT(*) FROM agreements`),
      client.query(`SELECT COUNT(*) FROM application_results`),
      client.query(`SELECT COUNT(*) FROM compatibility_matrix`),
      client.query(`SELECT COUNT(*) FROM land_cover_codes`),
      client.query(`SELECT COUNT(*) FROM land_cover_codes_actions`),
      client.query(`SELECT COUNT(*) FROM land_covers`),
      client.query(`SELECT COUNT(*) FROM land_parcels`),
      client.query(`SELECT COUNT(*) FROM moorland_designations`)
    ])

    const actionsCount = results[0].rows[0].count
    const actionsConfigCount = results[1].rows[0].count
    const agreementsCount = results[2].rows[0].count
    const applicationResultsCount = results[3].rows[0].count
    const compatibilityMatrixCount = results[4].rows[0].count
    const landCoverCodesCount = results[5].rows[0].count
    const landCoverCodesActionsCount = results[6].rows[0].count
    const landCoversCount = results[7].rows[0].count
    const landParcelsCount = results[8].rows[0].count
    const moorlandDesignationsCount = results[9].rows[0].count

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
        moorlandDesignationsCount
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
 * @import {Logger} from '~/src/api/common/logger.d.js'
 * @import {Pool} from '~/src/api/common/postgres.d.js'
 */
