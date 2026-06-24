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

    await truncateStagingTable(entity, dbClient)

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
 * Truncates the pre-existing staging table for the given entity
 * @param {string} entity - The entity name
 * @param {import('pg').Client} dbClient - Database connection
 * @returns {Promise<void>}
 */
export const truncateStagingTable = async (entity, dbClient) => {
  await dbClient.query(`TRUNCATE TABLE ${entity}_staging`)
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
