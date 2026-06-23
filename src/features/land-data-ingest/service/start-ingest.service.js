import {
  logBusinessError,
  logInfo
} from '../../common/helpers/logging/log-helpers.js'
import { INGEST_STATUS } from './ingest-status.js'

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
        [ingestId, filename, rows, INGEST_STATUS.PENDING]
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
    `UPDATE ingest SET status = 'cancelled' WHERE entity = $1 AND status = $2 RETURNING id`,
    [entity, INGEST_STATUS.IN_PROGRESS]
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

  const {
    rows: [ingest]
  } = await dbClient.query(
    `INSERT INTO ingest (entity, status) VALUES ($1, $2) RETURNING id`,
    [entity, INGEST_STATUS.IN_PROGRESS]
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

  await dbClient.query(
    `CREATE TABLE ${entity + '_staging'} (LIKE ${entity} INCLUDING ALL);`
  )

  // find foreign keys
  const { rows: fks } = await dbClient.query(
    `SELECT
      'ALTER TABLE ' || quote_ident($1 || '_staging')
       || ' ADD CONSTRAINT '
      || conname || ' '
      || pg_get_constraintdef(oid) || ';' AS fk_query
    FROM pg_constraint
    WHERE conrelid = $1::regclass
      AND contype = 'f';`,
    [entity]
  )
  // create foreign keys if any
  for (const fk of fks) {
    await dbClient.query(fk.fk_query)
  }
}

/**
 * Gets active ingest for the given entity
 * @param {string} entity - The entity to get active ingest for
 * @param {import('pg').Client} dbClient - Database connection
 * @returns {Promise<import('../ingest.d.js').Ingest|null>} The active ingest data
 */
export const getActiveIngestForEntity = async (entity, dbClient) => {
  const { rows } = await dbClient.query(
    `SELECT * FROM ingest WHERE entity = $1 AND status = $2 LIMIT 1`,
    [entity, INGEST_STATUS.IN_PROGRESS]
  )

  return rows?.[0]
}

/**
 * Gets the entity name associated with an ingest
 * @param {string | number} ingestId - The ingest ID
 * @param {import('pg').Client} dbClient - Database connection
 * @returns {Promise<string | undefined>} The entity name, if found
 */
export const getEntityNameForIngest = async (ingestId, dbClient) => {
  const { rows } = await dbClient.query(
    `SELECT entity FROM ingest WHERE id = $1`,
    [ingestId]
  )

  return rows?.[0]?.entity
}

/**
 * Sets the status of a file
 * @param {string} status - The status to set
 * @param {string} filename - The filename to set the status of
 * @param {number | string} ingestId - The ingest ID
 * @param {import('pg').Client} dbClient - Database connection
 * @returns {Promise<void>} Promise that resolves when the file status is set
 */
const setFileStatus = async (status, filename, ingestId, dbClient) => {
  await dbClient.query(
    `UPDATE ingest_files SET status = $1 WHERE ingest_id = $2 AND filename = $3`,
    [status, ingestId, filename]
  )
}

/**
 * Sets the status of a file to in progress
 * @param {string} filename - The filename to set the status of
 * @param {number | string} ingestId - The ingest ID
 * @param {import('pg').Client} dbClient - Database connection
 * @returns {Promise<void>} Promise that resolves when the file status is set
 */
export const setFileInProgress = async (filename, ingestId, dbClient) => {
  await setFileStatus(INGEST_STATUS.IN_PROGRESS, filename, ingestId, dbClient)
}

/**
 * Sets the status of a file to completed
 * @param {string} filename - The filename to set the status of
 * @param {number | string} ingestId - The ingest ID
 * @param {import('pg').Client} dbClient - Database connection
 * @returns {Promise<void>} Promise that resolves when the file status is set
 */
export const setFileCompleted = async (filename, ingestId, dbClient) => {
  await setFileStatus(INGEST_STATUS.COMPLETED, filename, ingestId, dbClient)
}

/**
 * Sets the status of a file to completed
 * @param {string} filename - The filename to set the status of
 * @param {number| string} ingestId - The ingest ID
 * @param {import('pg').Client} dbClient - Database connection
 * @returns {Promise<void>} Promise that resolves when the file status is set
 */
export const setFileFailed = async (filename, ingestId, dbClient) => {
  await setFileStatus(INGEST_STATUS.FAILED, filename, ingestId, dbClient)
}

/**
 * Validates that the file is part of the ingest and is in a pending state
 * @param {string | number} ingestId
 * @param {string} filename
 * @param {import('pg').Client} dbClient
 * @returns {Promise<boolean>} True if the file is valid, false otherwise
 */
export const isValidIngestFile = async (ingestId, filename, dbClient) => {
  const { rows } = await dbClient.query(
    `SELECT 
      1 
    FROM 
      ingest_files 
    WHERE ingest_id = $1 AND filename = $2 AND status = $3`,
    [ingestId, filename, INGEST_STATUS.PENDING]
  )

  return rows.length > 0
}
