import { readFile } from '../../common/helpers/read-file.js'
import { from } from 'pg-copy-streams'
import { pipeline } from 'node:stream/promises'

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
 * @param {ReadableStream} dataStream
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
 * @param {string} ingestId
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
 * @param {string} ingestId
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
