import { from } from 'pg-copy-streams'
import { pipeline } from 'node:stream/promises'
import { performance } from 'node:perf_hooks'
import { getDBOptions, createDBPool } from '../../common/helpers/postgres.js'
import { readFile } from '../../common/helpers/read-file.js'
import {
  logInfo,
  logBusinessError
} from '../../common/helpers/logging/log-helpers.js'
import { createSecureContext } from '../../common/helpers/secure-context/secure-context.js'

function hasDBOptions(options, logger) {
  logInfo(logger, {
    category: 'land-data-ingest',
    operation: 'hasDBOptions',
    message: 'Checking database options'
  })
  return options.user && options.database && options.host
}

async function importData(stream, tableName, logger) {
  const startTime = performance.now()
  logInfo(logger, {
    category: 'land-data-ingest',
    operation: `${tableName}_import_started`,
    message: `${tableName} import started`
  })

  const dbOptions = getDBOptions()
  if (!hasDBOptions(dbOptions, logger)) {
    throw new Error('Database options are not set')
  }
  const connection = createDBPool(dbOptions, {
    secureContext: createSecureContext(logger),
    logger
  })
  const client = await connection.connect()

  try {
    await client.query(
      await readFile(`/${tableName}/create_${tableName}_temp_table.sql`)
    )

    await client.query(`
      insert into ${tableName}_tmp (OBJECTID) values (999999);
    `)

    const pgStream = client.query(
      from(
        `COPY ${tableName}_tmp FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ',')`
      )
    )

    await pipeline(stream, pgStream)

    const tempTableCount = await client.query(
      `select count(*) from ${tableName}_tmp`
    )
    if (Number(tempTableCount.rows[0].count) === 0) {
      throw new Error(`No data found in ${tableName}_tmp`)
    }

    logInfo(logger, {
      category: 'land-data-ingest',
      operation: `${tableName}_import_temp_table`,
      message: `${tempTableCount.rows[0].count} records to be inserted to  ${tableName} from temp table ${tableName}_tmp`,
      context: { tableName, tempTableCount: tempTableCount.rows[0].count }
    })

    const result = await client.query(
      await readFile(`/${tableName}/insert_${tableName}.sql`)
    )

    const endTime = performance.now()
    const duration = endTime - startTime
    logInfo(logger, {
      category: 'land-data-ingest',
      operation: `${tableName}_import_completed`,
      message: `${tableName} imported successfully in ${duration}ms`,
      context: { rowCount: result.rowCount, duration }
    })
  } catch (error) {
    logBusinessError(logger, {
      operation: `${tableName}_import_failed`,
      error,
      context: { tableName }
    })
    throw error
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
  await importData(landParcelsStream, 'land_parcels', logger)
}

export async function importLandCovers(landCoversStream, logger) {
  await importData(landCoversStream, 'land_covers', logger)
}

export async function importMoorlandDesignations(
  moorlandDesignationsStream,
  logger
) {
  await importData(moorlandDesignationsStream, 'moorland_designations', logger)
}
/**
 * @import { Logger } from '../../common/logger.d.js'
 */
