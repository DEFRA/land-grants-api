import { logDatabaseError } from '../../common/helpers/logging/log-helpers.js'

const BATCH_DELAY_MS = 100

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const mergeResults = (results) =>
  Object.assign({}, ...results.map((r) => r.rows[0]))

const runStatsQuery = async (client) => {
  await client.query('SET max_parallel_workers_per_gather = 0')

  const results = []

  results.push(
    ...(await Promise.all([
      client.query(`SELECT COUNT(*) AS "actionsCount" FROM actions`),
      client.query(
        `SELECT COUNT(*) AS "actionsConfigCount" FROM actions_config`
      ),
      client.query(`SELECT COUNT(*) AS "agreementsCount" FROM agreements`),
      client.query(
        `SELECT COUNT(*) AS "applicationResultsCount" FROM application_results`
      ),
      client.query(
        `SELECT COUNT(*) AS "compatibilityMatrixCount" FROM compatibility_matrix`
      )
    ]))
  )

  await sleep(BATCH_DELAY_MS)

  results.push(
    ...(await Promise.all([
      client.query(
        `SELECT COUNT(*) AS "landCoverCodesCount" FROM land_cover_codes`
      ),
      client.query(
        `SELECT COUNT(*) AS "landCoverCodesActionsCount" FROM land_cover_codes_actions`
      ),
      client.query(`SELECT COUNT(*) AS "landCoversCount" FROM land_covers`),
      client.query(`SELECT COUNT(*) AS "landParcelsCount" FROM land_parcels`)
    ]))
  )

  await sleep(BATCH_DELAY_MS)

  results.push(
    ...(await Promise.all([
      client.query(
        `SELECT COUNT(*) AS "sssiCount" FROM data_layer WHERE data_layer_type_id = 1`
      ),
      client.query(
        `SELECT COUNT(*) AS "moorlandDesignationsCount" FROM data_layer WHERE data_layer_type_id = 2`
      ),
      client.query(
        `SELECT COUNT(*) AS "registeredParksGardensCount" FROM data_layer WHERE data_layer_type_id = 3 and (metadata->>'type') = 'registered_parks_gardens'`
      ),
      client.query(
        `SELECT COUNT(*) AS "registeredBattlefieldsCount" FROM data_layer WHERE data_layer_type_id = 3 and (metadata->>'type') = 'registered_battlefields'`
      ),
      client.query(
        `SELECT COUNT(*) AS "scheduledMonumentsCount" FROM data_layer WHERE data_layer_type_id = 3 and (metadata->>'type') = 'scheduled_monuments'`
      ),
      client.query(
        `SELECT COUNT(*) AS "shineCount" FROM data_layer WHERE data_layer_type_id = 3 and (metadata->>'type') = 'shine'`
      )
    ]))
  )

  await sleep(BATCH_DELAY_MS)

  results.push(
    ...(await Promise.all([
      client.query(
        `SELECT COUNT(DISTINCT (sheet_id, parcel_id)) AS "uniqueParcelsCount" FROM land_parcels`
      ),
      client.query(
        `SELECT COUNT(DISTINCT (sheet_id, parcel_id)) AS "uniqueCoversCount" FROM land_covers`
      )
    ]))
  )

  await sleep(BATCH_DELAY_MS)

  results.push(
    ...(await Promise.all([
      client.query(
        `SELECT COUNT(*) AS "duplicateCoversCount" FROM (
        SELECT 1 FROM land_covers
        GROUP BY parcel_id, sheet_id, land_cover_class_code, geom_hash
        HAVING COUNT(*) > 1
      )`
      ),
      client.query(
        `SELECT COUNT(*) AS "unlinkedParcelsCount"
        FROM land_parcels p
        LEFT JOIN land_covers c ON c.sheet_id = p.sheet_id AND c.parcel_id = p.parcel_id
        WHERE c.sheet_id IS NULL`
      ),
      client.query(
        `SELECT COUNT(*) AS "unlinkedCoversCount"
        FROM land_covers c
        LEFT JOIN land_parcels p ON c.sheet_id = p.sheet_id AND c.parcel_id = p.parcel_id
        WHERE p.sheet_id IS NULL`
      )
    ]))
  )

  await client.query('SET max_parallel_workers_per_gather = DEFAULT')

  return mergeResults(results)
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
