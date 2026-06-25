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
  truncateTableAndInsertData,
  isIngestComplete,
  promoteStagingTable,
  logDuplicateRows
} from './data-helpers.js'
import { metricsCounter } from '../../common/helpers/metrics.js'
import {
  setFileCompleted,
  setFileFailed,
  setFileInProgress,
  setIngestCompleted
} from './start-ingest.service.js'

const logCategory = 'land-data-ingest'

const DEDUPE_COLUMNS_BY_ENTITY = {
  land_parcels: ['SHEET_ID', 'PARCEL_ID']
}

function hasDBOptions(options, logger) {
  logInfo(logger, {
    category: logCategory,
    operation: 'hasDBOptions',
    message: 'Checking database options'
  })
  return options.user && options.database && options.host
}

/**
 * Opens a database connection for an import run
 * @param {import('../../common/logger.d.js').Logger} logger - The logger
 * @returns {Promise<import('pg').PoolClient>} The connected client
 */
async function connectToDb(logger) {
  const dbOptions = getDBOptions()
  if (!hasDBOptions(dbOptions, logger)) {
    throw new Error('Database options are not set')
  }
  const connection = createDBPool(dbOptions, {
    secureContext: createSecureContext(logger),
    logger
  })
  return await connection.connect()
}

/**
 * Logs duplicate rows for entities that require deduping, if any
 * @param {import('pg').Client} dbClient - Database connection
 * @param {string} entityName - The entity name
 * @param {import('../../common/logger.d.js').Logger} logger - The logger
 */
async function dedupeIfNeeded(dbClient, entityName, logger) {
  const dedupeColumns = DEDUPE_COLUMNS_BY_ENTITY[entityName]
  if (dedupeColumns) {
    await logDuplicateRows(dbClient, entityName, dedupeColumns, logger)
  }
}

/**
 * Logs an alert and throws when the staging table has more rows than expected
 * @param {{isOverCount: boolean, entityName: string, ingestId: string | number, totalCount: number, logger: object}} params
 */
function assertWithinExpectedCount({
  isOverCount,
  entityName,
  ingestId,
  totalCount,
  logger
}) {
  if (!isOverCount) {
    return
  }

  const overCountError = new Error(
    `Ingest row count exceeds expected total for ${entityName}`
  )
  logBusinessError(logger, {
    operation: `${entityName}_import_over_count`,
    error: overCountError,
    context: { entityName, ingestId, totalCount }
  })
  throw overCountError
}

/**
 * Promotes the staging table to live when the ingest is complete
 * @param {{isComplete: boolean, entityName: string, dbClient: object, totalCount: number, logger: object}} params
 */
async function promoteIfComplete({
  isComplete,
  entityName,
  dbClient,
  totalCount,
  logger
}) {
  if (!isComplete) {
    return
  }

  await promoteStagingTable(entityName, dbClient)
  logInfo(logger, {
    category: logCategory,
    operation: `${entityName}_import_completed`,
    message: `${entityName} imported successfully`,
    context: { totalCount }
  })
  await metricsCounter(`${entityName}_data_ingest_completed`, totalCount)
}

/**
 * Import data to the database
 * @param {import('stream').Readable} dataStream - The data stream
 * @param {import('../../common/common.d.js').EntityType} entityType - The table name
 * @param {string | number} ingestId - The ingest ID
 * @param {string | undefined} filename
 * @param {import('../../common/logger.d.js').Logger} logger - The logger
 */
export async function importData(
  dataStream,
  entityType,
  ingestId,
  filename,
  logger
) {
  if (entityType.ingest === true) {
    await importDataValidate(dataStream, entityType, ingestId, filename, logger)
  } else {
    await importDataAsIs(dataStream, entityType, ingestId, logger)
  }
}

/**
 * ingests data files as is
 * @param {import('stream').Readable} dataStream - The data stream
 * @param {import('../../common/common.d.js').EntityType} entityType - The table name
 * @param {string | number} ingestId - The ingest ID
 * @param {import('../../common/logger.d.js').Logger} logger - The logger
 */
export async function importDataAsIs(dataStream, entityType, ingestId, logger) {
  const startTime = performance.now()

  const { name: entityName, truncateTable } = entityType
  logInfo(logger, {
    category: logCategory,
    operation: `${entityName}_import_started`,
    message: `${entityName} import started`,
    context: { ingestId, truncateTable }
  })

  const client = await connectToDb(logger)

  try {
    await createTempTable(client, entityName)
    await copyDataToTempTable(client, entityName, dataStream)

    let result
    if (truncateTable) {
      result = await truncateTableAndInsertData(client, entityName, ingestId)
    } else {
      result = await insertData(client, entityName, ingestId)
    }

    const endTime = performance.now()
    const duration = endTime - startTime
    logInfo(logger, {
      category: logCategory,
      operation: `${entityName}_file_import_completed`,
      message: `${entityName} file imported successfully in ${duration}ms`,
      context: { rowCount: result?.rowCount, duration }
    })
    await metricsCounter(
      `${entityName}_file_ingest_completed`,
      result?.rowCount
    )
  } catch (error) {
    logBusinessError(logger, {
      operation: `${entityName}_import_failed`,
      error,
      context: { entityName }
    })
    await metricsCounter(`${entityName}_data_ingest_failed`, 1)
    throw error
  } finally {
    await client?.query(`DROP TABLE IF EXISTS ${entityName}_tmp`)
    await client?.end()
  }
}

/**
 * ingests data and checks all rows are present before promoting table
 * @param {import('stream').Readable} dataStream - The data stream
 * @param {import('../../common/common.d.js').EntityType} entityType - The table name
 * @param {string | number} ingestId - The ingest ID
 * @param {string | undefined} filename
 * @param {import('../../common/logger.d.js').Logger} logger - The logger
 */
export async function importDataValidate(
  dataStream,
  entityType,
  ingestId,
  filename,
  logger
) {
  const startTime = performance.now()

  const { name: entityName, truncateTable } = entityType
  logInfo(logger, {
    category: logCategory,
    operation: `${entityName}_import_started`,
    message: `${entityName} import started`,
    context: { ingestId, truncateTable, filename }
  })

  const dbClient = await connectToDb(logger)

  try {
    // @ts-expect-error filename
    await setFileInProgress(filename, ingestId, dbClient)
    await createTempTable(dbClient, entityName)
    await copyDataToTempTable(dbClient, entityName, dataStream)
    await dedupeIfNeeded(dbClient, entityName, logger)

    const { rowCount } = await insertData(dbClient, entityName, ingestId)
    // @ts-expect-error filename
    await setFileCompleted(filename, ingestId, dbClient)

    const { isComplete, isOverCount, totalCount } = await isIngestComplete(
      entityName,
      ingestId,
      dbClient
    )

    assertWithinExpectedCount({
      isOverCount,
      entityName,
      ingestId,
      totalCount,
      logger
    })
    await promoteIfComplete({
      isComplete,
      entityName,
      dbClient,
      totalCount,
      logger
    })

    if (isComplete) {
      await setIngestCompleted(ingestId, dbClient)
    }

    const endTime = performance.now()
    const duration = endTime - startTime
    logInfo(logger, {
      category: logCategory,
      operation: `${entityName}_file_import_completed`,
      message: `${entityName} file imported successfully in ${duration}ms`,
      context: { rowCount, duration }
    })
    await metricsCounter(`${entityName}_file_ingest_completed`, rowCount)
  } catch (error) {
    logBusinessError(logger, {
      operation: `${entityName}_import_failed`,
      error,
      context: { entityName, filename }
    })
    // @ts-expect-error filename
    await setFileFailed(filename, ingestId, dbClient)
    await metricsCounter(`${entityName}_data_ingest_failed`, 1)
    throw error
  } finally {
    await dbClient?.query(`DROP TABLE IF EXISTS ${entityName}_tmp`)
    await dbClient?.end()
  }
}

/**
 * @import { Logger } from '../../common/logger.d.js'
 */
