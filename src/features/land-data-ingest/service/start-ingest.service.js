import {
  logBusinessError,
  logInfo
} from '../../common/helpers/logging/log-helpers.js'

/**
 * Saves the ingest start data to the database
 * @param {{files: Array<{ filename: string, rows: number }>}} data - Object containing files to ingest
 * @param {string} entity - The entity to create an ingest for
 * @param {import('pg').Client} dbClient - Database connection
 * @param {object} logger - Logger instance
 * @returns {Promise<object>} The ingest data
 */
export const saveIngestStart = async (data, entity, dbClient, logger) => {
  try {
    const { files } = data
    const ingestId = await cancelAndCreateNewIngest(entity, dbClient, logger)

    for (const file of files) {
      const { filename, rows } = file

      await dbClient.query(
        `INSERT INTO ingest_files (ingest_id, filename, total_rows, status) VALUES ($1, $2, $3, $4)`,
        [ingestId, filename, rows, 'pending']
      )
    }

    await dropAndCreateNewStagingTable(entity, dbClient, logger)

    return ingestId
  } catch (error) {
    logBusinessError(logger, {
      operation: 'start_ingest',
      context: {
        entity,
        data
      },
      error
    })
    throw error
  }
}

/**
 * Cancels existing in progress ingests and creates a new ingest record
 * @param {string} entity - The entity to create an ingest for
 * @param {import('pg').Client} dbClient - Database connection
 * @param {object} logger - Logger instance
 * @returns {Promise<object>} The ingest data
 */
export const cancelAndCreateNewIngest = async (entity, dbClient, logger) => {
  // set in progress ingests to cancelled
  const { rows } = await dbClient.query(
    `UPDATE ingest SET status = 'cancelled' WHERE entity = $1 AND status = 'in_progress' RETURNING id`,
    [entity]
  )

  if (rows.length > 0) {
    logInfo(logger, {
      category: 'ingest',
      message: `Ingest tasks cancelled: ${rows.map((row) => row.id).join()}`,
      context: {
        ids: rows.map((row) => row.id),
        entity
      }
    })
  }

  // insert new ingest
  const {
    rows: [ingest]
  } = await dbClient.query(
    `INSERT INTO ingest (entity, status) VALUES ($1, $2) RETURNING id`,
    [entity, 'in_progress']
  )

  return ingest.id
}

/**
 * Drops stagin table and creates a new staging table for the given entity
 * @param {string} entity - The entity to create a staging table for
 * @param {import('pg').Client} dbClient - Database connection
 * @param {object} logger - Logger instance
 * @returns {Promise<void>} Promise that resolves when the staging table is created
 */
export const dropAndCreateNewStagingTable = async (
  entity,
  dbClient,
  logger
) => {
  const tblResult = await dbClient.query(
    `SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = $1`,
    [`${entity}_staging`]
  )

  if (tblResult.rows.length > 0) {
    await dbClient.query(`DROP TABLE ${entity}_staging`)
    logBusinessError(logger, {
      operation: 'start_ingest',
      context: `${entity}_staging`,
      error: new Error('Staging table already exists')
    })
  }

  await dbClient.query(`CREATE TABLE ${entity}_staging (LIKE ${entity})`)
}
