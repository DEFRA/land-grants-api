import { performance } from 'node:perf_hooks'
import { readFile } from '../../common/helpers/read-file.js'
import { from } from 'pg-copy-streams'
import { pipeline } from 'node:stream/promises'
import { logInfo } from '../../common/helpers/logging/log-helpers.js'

/**
 * Returns the number of rows in a table
 * @param {import('pg').Client} dbClient
 * @param {string} tableName
 * @returns {Promise<number>}
 */
export async function getTableRowCount(dbClient, tableName) {
  const {
    rows: [{ count }]
  } = await dbClient.query(`SELECT COUNT(*) as count FROM ${tableName}`)
  return Number(count)
}

/**
 * Create a temporary table to store the data
 * @param {import('pg').Client} dbClient
 * @param {string} tableName
 */
export async function createTempTable(dbClient, tableName) {
  await dbClient.query(`DROP TABLE IF EXISTS ${tableName}_tmp CASCADE;`)
  await dbClient.query(
    await readFile(`/${tableName}/create_${tableName}_temp_table.sql`)
  )
}

/**
 * Copy data to the temporary table
 * @param {import('pg').Client} dbClient
 * @param {string} tableName
 * @param {import('stream').Readable} dataStream
 */
export async function copyDataToTempTable(dbClient, tableName, dataStream) {
  const pgStream = dbClient.query(
    from(
      `COPY ${tableName}_tmp FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ',')`
    )
  )
  await pipeline(dataStream, pgStream)
}

/**
 * Insert data into the table
 * @param {import('pg').Client} dbClient
 * @param {string} tableName
 * @param {string | number} ingestId
 * @returns {Promise<import('pg').QueryResult>}
 */
export async function insertData(dbClient, tableName, ingestId) {
  return dbClient.query(
    await readFile(`/${tableName}/insert_${tableName}.sql`),
    [ingestId]
  )
}

/**
 * Truncate the table and insert data
 * @param {import('pg').Client} dbClient
 * @param {string} tableName
 * @param {string | number} ingestId
 * @returns {Promise<import('pg').QueryResult>}
 */
export async function truncateTableAndInsertData(
  dbClient,
  tableName,
  ingestId
) {
  try {
    await dbClient.query(`BEGIN`)
    await dbClient.query(`TRUNCATE TABLE ${tableName};`)
    const result = await insertData(dbClient, tableName, ingestId)
    await dbClient.query(`COMMIT`)
    return result
  } catch (error) {
    await dbClient.query(`ROLLBACK`)
    throw error
  }
}

/**
 * check ingested rows matched expected count
 * @param {*} tableName
 * @param {*} ingestId
 * @param {*} dbClient
 * @returns {Promise<{isComplete: boolean, isOverCount: boolean, totalCount: number}>}
 */
export async function isIngestComplete(tableName, ingestId, dbClient) {
  // count rows in stagin table
  const {
    rows: [{ count }]
  } = await dbClient.query(
    `SELECT count(*) as count FROM ${tableName + '_staging'}`
  )

  // sum up file count
  const {
    rows: [{ total_rows: totalRows }]
  } = await dbClient.query(
    `SELECT
        SUM(f.total_rows) as total_rows
    FROM
        ingest i
        INNER JOIN ingest_files f ON i.id = f.ingest_id
    WHERE
        i.id = $1`,
    [ingestId]
  )

  const totalCount = Number(count)
  const expectedCount = Number(totalRows)

  return {
    isComplete: totalCount === expectedCount,
    isOverCount: totalCount > expectedCount,
    totalCount
  }
}

/**
 * Counts duplicate rows in a temp table for the given dedupe columns and logs the result
 * @param {import('pg').Client} dbClient
 * @param {string} tableName
 * @param {string[]} dedupeColumns
 * @param {object} logger
 * @returns {Promise<number>} The number of duplicate rows found
 */
export async function logDuplicateRows(
  dbClient,
  tableName,
  dedupeColumns,
  logger
) {
  const columns = dedupeColumns.join(', ')

  const {
    rows: [{ duplicate_count: duplicateCount }]
  } = await dbClient.query(
    `SELECT COUNT(*) - COUNT(DISTINCT (${columns})) AS duplicate_count FROM ${tableName}_tmp`
  )

  const count = Number(duplicateCount)

  logInfo(logger, {
    category: 'land-data-ingest',
    operation: `${tableName}_duplicate_check`,
    message: `${count} duplicate rows found in ${tableName}_tmp on (${columns})`,
    context: { tableName, dedupeColumns, duplicateCount: count }
  })

  return count
}

/**
 * Promotes the staging table to live within a transaction.
 * Uses TRUNCATE + INSERT because land_grants_api holds TRUNCATE/INSERT
 * privileges on the live table but does not own it (ownership required for ALTER TABLE RENAME).
 * The staging table is permanent (pre-created by Liquibase) so it is not dropped.
 * @param {string} tableName
 * @param {import('pg').Client} dbClient
 */
export async function promoteStagingTable(tableName, dbClient, logger) {
  const startTime = performance.now()

  try {
    await dbClient.query('BEGIN')
    await dbClient.query(`TRUNCATE TABLE ${tableName}`)
    await dbClient.query(
      `INSERT INTO ${tableName} SELECT * FROM ${tableName}_staging`
    )
    await dbClient.query(`TRUNCATE TABLE ${tableName}_staging`)
    await dbClient.query('COMMIT')

    const duration = performance.now() - startTime
    logInfo(logger, {
      category: 'land-data-ingest',
      operation: `${tableName}_staging_promoted`,
      message: `Staging table ${tableName} promoted to live in ${duration.toFixed(0)}ms`,
      context: { tableName, duration }
    })
  } catch (error) {
    await dbClient.query('ROLLBACK')
    throw error
  }
}
