import { performance } from 'node:perf_hooks'
import { getDBOptions, createDBClient } from '../../common/helpers/postgres.js'
import {
  logInfo,
  logBusinessError
} from '../../common/helpers/logging/log-helpers.js'
import { createSecureContext } from '../../common/helpers/secure-context/secure-context.js'
import {
  copyDataToTempTable,
  createTempTable,
  getTableRowCount,
  insertData,
  truncateTableAndInsertData,
  isIngestComplete,
  promoteStagingTable,
  completeAndPromotePaired,
  failPairedAwaitingIngest,
  logDuplicateRows
} from './data-helpers.js'
import { metricsCounter } from '../../common/helpers/metrics.js'
import {
  cancelPendingFiles,
  setFileCompleted,
  setFileFailed,
  setFileInProgress,
  setIngestCompleted,
  setIngestFailed,
  getFileExpectedRowCount
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
  const client = createDBClient(dbOptions, {
    secureContext: createSecureContext(logger),
    logger
  })
  await client.connect()
  return client
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
 * Logs and throws when the overall staging row count does not match the expected total
 * @param {{isOverCount: boolean, entityName: string, ingestId: string | number, totalCount: number, logger: object}} params
 */
function assertExpectedCount({
  isOverCount,
  entityName,
  ingestId,
  totalCount,
  logger
}) {
  if (!isOverCount) {
    return
  }

  const error = new Error(
    `Ingest row count does not match expected total for ${entityName}`
  )
  logBusinessError(logger, {
    operation: `${entityName}_import_over_count`,
    error,
    context: { entityName, ingestId, totalCount }
  })
  throw error
}

/**
 * Logs and throws when the file's actual row count (temp table) does not match what the payload declared
 * @param {string} filename
 * @param {string | number} ingestId
 * @param {string} entityName
 * @param {import('pg').Client} dbClient
 * @param {import('../../common/logger.d.js').Logger} logger
 */
async function assertFileRowCount(
  filename,
  ingestId,
  entityName,
  dbClient,
  logger
) {
  const actualCount = await getTableRowCount(dbClient, `${entityName}_tmp`)
  const expectedCount = await getFileExpectedRowCount(
    ingestId,
    filename,
    dbClient
  )

  if (actualCount !== expectedCount) {
    const error = new Error(
      `File row count mismatch for ${filename}: expected ${expectedCount}, got ${actualCount}`
    )
    logBusinessError(logger, {
      operation: `${entityName}_file_row_count_mismatch`,
      error,
      context: { entityName, filename, ingestId, expectedCount, actualCount }
    })
    throw error
  }
}

/**
 * Finalizes the ingest once all files have landed in staging. Entities that are paired
 * (land_parcels/land_covers) must be promoted together, so this entity is marked completed
 * and only actually promoted once its pair has also finished staging.
 * @param {{isComplete: boolean, entityType: import('../../common/common.d.js').EntityType, ingestId: string | number, dbClient: object, totalCount: number, logger: object}} params
 */
async function finalizeIfComplete({
  isComplete,
  entityType,
  ingestId,
  dbClient,
  totalCount,
  logger
}) {
  if (!isComplete) {
    return
  }

  const { name: entityName, pairedWith } = entityType

  let promoted
  if (pairedWith) {
    promoted = await completeAndPromotePaired(
      entityName,
      pairedWith,
      ingestId,
      dbClient,
      logger
    )
  } else {
    await promoteStagingTable(entityName, dbClient, logger)
    await setIngestCompleted(ingestId, dbClient)
    promoted = true
  }

  if (!promoted) {
    return
  }

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
 * Loads one file into staging, validates its row count, and finalizes the ingest (promoting
 * it, or its paired entity's tables, once complete).
 * @param {import('stream').Readable} dataStream - The data stream
 * @param {import('../../common/common.d.js').EntityType} entityType - The table name
 * @param {string | number} ingestId - The ingest ID
 * @param {string | undefined} filename
 * @param {import('pg').Client} dbClient - Database connection
 * @param {import('../../common/logger.d.js').Logger} logger - The logger
 */
async function processValidatedFile(
  dataStream,
  entityType,
  ingestId,
  filename,
  dbClient,
  logger
) {
  const startTime = performance.now()
  const { name: entityName } = entityType

  // @ts-expect-error filename
  await setFileInProgress(filename, ingestId, dbClient)
  await createTempTable(dbClient, entityName)
  await copyDataToTempTable(dbClient, entityName, dataStream)
  await dedupeIfNeeded(dbClient, entityName, logger)

  // @ts-expect-error filename
  await assertFileRowCount(filename, ingestId, entityName, dbClient, logger)

  const { rowCount } = await insertData(dbClient, entityName, ingestId)
  // @ts-expect-error filename
  await setFileCompleted(filename, ingestId, dbClient)

  const { isComplete, isOverCount, totalCount } = await isIngestComplete(
    entityName,
    ingestId,
    dbClient
  )

  assertExpectedCount({ isOverCount, entityName, ingestId, totalCount, logger })
  await finalizeIfComplete({
    isComplete,
    entityType,
    ingestId,
    dbClient,
    totalCount,
    logger
  })

  const duration = performance.now() - startTime
  logInfo(logger, {
    category: logCategory,
    operation: `${entityName}_file_import_completed`,
    message: `${entityName} file imported successfully in ${duration}ms`,
    context: { rowCount, duration }
  })
  await metricsCounter(`${entityName}_file_ingest_completed`, rowCount)
}

/**
 * Marks the file/ingest as failed, cancels any pending files, and - if this entity is
 * paired with another - fails that paired entity's awaiting ingest too.
 * @param {Error} error
 * @param {import('../../common/common.d.js').EntityType} entityType - The table name
 * @param {string | number} ingestId - The ingest ID
 * @param {string | undefined} filename
 * @param {import('pg').Client} dbClient - Database connection
 * @param {import('../../common/logger.d.js').Logger} logger - The logger
 */
async function handleImportFailure(
  error,
  entityType,
  ingestId,
  filename,
  dbClient,
  logger
) {
  const { name: entityName, pairedWith } = entityType

  logBusinessError(logger, {
    operation: `${entityName}_import_failed`,
    error,
    context: { entityName, filename }
  })
  // @ts-expect-error filename
  await setFileFailed(filename, ingestId, dbClient)
  await setIngestFailed(ingestId, dbClient)
  await cancelPendingFiles(ingestId, dbClient)
  if (pairedWith) {
    await failPairedAwaitingIngest(entityName, pairedWith, dbClient, logger)
  }
  await metricsCounter(`${entityName}_data_ingest_failed`, 1)
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
  const { name: entityName, truncateTable } = entityType
  logInfo(logger, {
    category: logCategory,
    operation: `${entityName}_import_started`,
    message: `${entityName} import started`,
    context: { ingestId, truncateTable, filename }
  })

  const dbClient = await connectToDb(logger)

  try {
    await processValidatedFile(
      dataStream,
      entityType,
      ingestId,
      filename,
      dbClient,
      logger
    )
  } catch (error) {
    await handleImportFailure(
      error,
      entityType,
      ingestId,
      filename,
      dbClient,
      logger
    )
    throw error
  } finally {
    await dbClient?.query(`DROP TABLE IF EXISTS ${entityName}_tmp`)
    await dbClient?.end()
  }
}

/**
 * @import { Logger } from '../../common/logger.d.js'
 */
