import { from } from 'pg-copy-streams'
import { pipeline } from 'node:stream/promises'
import { performance } from 'node:perf_hooks'
import { getDBOptions, createDBPool } from '../../common/helpers/postgres.js'
import { readFile } from '../../common/helpers/read-file.js'
import {
  logInfo,
  logBusinessError
} from '../../common/helpers/logging/log-helpers.js'

function hasDBOptions(options) {
  return options.user && options.database && options.host && options.port
}

async function importData(stream, tableName, logger) {
  const startTime = performance.now()
  logInfo(logger, {
    category: 'land-data-ingest',
    operation: `${tableName}_import_started`,
    message: `${tableName} import started`
  })

  const dbOptions = getDBOptions()
  if (!hasDBOptions(dbOptions)) {
    throw new Error('Database options are not set')
  }
  const connection = createDBPool(dbOptions)
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

    const endTime = performance.now()
    const duration = endTime - startTime
    logInfo(logger, {
      category: 'land-data-ingest',
      operation: `${tableName}_import_completed`,
      message: `${tableName} imported successfully in ${duration}ms`,
      context: { rowCount: result.rowCount, duration }
    })

    return true
  } catch (error) {
    logBusinessError(logger, {
      operation: `${tableName}_import_failed`,
      error,
      context: { tableName }
    })
    return false
  } finally {
    await client?.query(`DROP TABLE IF EXISTS ${tableName}_tmp`)
    await client?.end()
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
