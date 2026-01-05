import { performance } from 'node:perf_hooks'
import { getDBOptions, createDBPool } from '../../common/helpers/postgres.js'
import {
  logInfo,
  logBusinessError
} from '../../common/helpers/logging/log-helpers.js'
import { createSecureContext } from '../../common/helpers/secure-context/secure-context.js'
import {
  copyDataToTempTable,
  createTempTable,
  insertData,
  truncateTableAndInsertData
} from './data-helpers.js'

const logCategory = 'land-data-ingest'

function hasDBOptions(options, logger) {
  logInfo(logger, {
    category: logCategory,
    operation: 'hasDBOptions',
    message: 'Checking database options'
  })
  return options.user && options.database && options.host
}

/**
 * Import data to the database
 * @param {ReadableStream} dataStream - The data stream
 * @param {string} tableName - The table name
 * @param {string} ingestId - The ingest ID
 * @param {Logger} logger - The logger
 * @param {boolean} truncateTable - Whether to truncate the table
 */
export async function importData(
  dataStream,
  tableName,
  ingestId,
  logger,
  truncateTable = false
) {
  const startTime = performance.now()
  logInfo(logger, {
    category: logCategory,
    operation: `${tableName}_import_started`,
    message: `${tableName} import started`,
    context: { ingestId }
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
    await createTempTable(client, tableName)
    await copyDataToTempTable(client, tableName, dataStream)

    let result
    if (truncateTable) {
      result = await truncateTableAndInsertData(client, tableName, ingestId)
    } else {
      result = await insertData(client, tableName, ingestId)
    }

    const endTime = performance.now()
    const duration = endTime - startTime
    logInfo(logger, {
      category: logCategory,
      operation: `${tableName}_import_completed`,
      message: `${tableName} imported successfully in ${duration}ms`,
      context: { rowCount: result?.rowCount, duration },
      outcome: duration
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
 * @import { Logger } from '../../common/logger.d.js'
 */
