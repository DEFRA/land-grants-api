import { from } from 'pg-copy-streams'
import { pipeline } from 'node:stream/promises'
import { getDBOptions, createDBPool } from '../../common/helpers/postgres.js'
import { readFile } from '../../common/helpers/read-file.js'

async function importData(stream, tableName, logger) {
  logger.info(`Importing ${tableName}`)

  const connection = createDBPool(getDBOptions())
  const client = await connection.connect()

  try {
    await client.query(
      await readFile(
        `../../../../scripts/import-land-data/${tableName}/create_${tableName}_temp_table.sql`
      )
    )

    const pgStream = client.query(
      from(
        `COPY ${tableName}_tmp FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ',')`
      )
    )

    await pipeline(stream, pgStream)

    const result = await client.query(
      await readFile(
        `../../../../scripts/import-land-data/${tableName}/insert_${tableName}.sql`
      )
    )

    logger.info(`${tableName} imported successfully`, result.rowCount)

    return true
  } catch (error) {
    logger.error(`Failed to import ${tableName}: ${error.message}`)
    return false
  } finally {
    await client?.query(`drop table ${tableName}_tmp`)
    await client?.end()
    await connection?.end()
  }
}

/**
 *
 * @param {ReadableStream} landParcelsStream
 * @param {Logger} logger
 */
export async function importLandParcels(landParcelsStream, logger) {
  return importData(landParcelsStream, 'land_parcels', logger)
}

export async function importLandCovers(landCoversStream, logger) {
  return importData(landCoversStream, 'land_covers', logger)
}

export async function importMoorlandDesignations(
  moorlandDesignationsStream,
  logger
) {
  return importData(moorlandDesignationsStream, 'moorland_designations', logger)
}
/**
 * @import { Logger } from '../../common/logger.d.js'
 */
