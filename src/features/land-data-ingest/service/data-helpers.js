import { performance } from 'node:perf_hooks'
import { readFile } from '../../common/helpers/read-file.js'
import { from } from 'pg-copy-streams'
import { pipeline } from 'node:stream/promises'
import {
  logInfo,
  logBusinessError
} from '../../common/helpers/logging/log-helpers.js'
import { INGEST_STATUS } from './ingest-status.js'

const LOG_CATEGORY = 'land-data-ingest'

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
  // count rows in staging table for this ingest only - rows left behind by a cancelled or
  // overlapping ingest must never satisfy completeness or be counted as over-count
  const {
    rows: [{ count }]
  } = await dbClient.query(
    `SELECT count(*) as count FROM ${tableName + '_staging'} WHERE ingest_id = $1`,
    [ingestId]
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
    category: LOG_CATEGORY,
    operation: `${tableName}_duplicate_check`,
    message: `${count} duplicate rows found in ${tableName}_tmp on (${columns})`,
    context: { tableName, dedupeColumns, duplicateCount: count }
  })

  return count
}

/**
 * Swaps the staging table with the live table so the freshly ingested staging data
 * becomes the live data. The old live table is recycled as the (now empty) staging
 * table for the next ingest, so no tables are created or dropped and the live table
 * keeps its indexes (they are maintained while the staging table is loaded, off the
 * live path). Runs through the swap_staging_with_live SECURITY DEFINER function
 * (owned by the DDL role that runs the migrations) because the runtime role holds
 * only grantable DML privileges and does not own the tables, which ALTER TABLE
 * RENAME requires. Caller is responsible for wrapping this in a transaction.
 * @param {string} tableName
 * @param {import('pg').Client} dbClient
 */
async function swapStagingWithLive(tableName, dbClient) {
  await dbClient.query('SELECT swap_staging_with_live($1)', [tableName])
}

/**
 * Promotes the staging table to live by swapping the table names in place: the staging
 * table (with its indexes already built) becomes the live table and the old live table
 * is recycled as the empty staging table for the next ingest. No indexes are dropped or
 * rebuilt, so the promotion is a short transaction of metadata renames.
 * @param {string} tableName
 * @param {import('pg').Client} dbClient
 * @param {object} logger
 */
export async function promoteStagingTable(tableName, dbClient, logger) {
  const startTime = performance.now()

  try {
    await dbClient.query('BEGIN')
    await swapStagingWithLive(tableName, dbClient)
    await dbClient.query('COMMIT')
  } catch (error) {
    await dbClient.query('ROLLBACK')
    throw error
  }

  const duration = performance.now() - startTime
  logInfo(logger, {
    category: LOG_CATEGORY,
    operation: `${tableName}_staging_promoted`,
    message: `Staging table ${tableName} promoted to live in ${duration.toFixed(0)}ms`,
    context: { tableName, duration }
  })
}

/**
 * Fetches the id/status of an entity's latest ingest that belongs to the same run as the
 * given reference ingest. Must be called while holding the pair's advisory lock when used
 * for pair coordination. An ingest started on a different UTC calendar day is treated as a
 * leftover from a previous run and is never returned. No status filter is applied so callers
 * can still react to a same-run paired ingest that has failed or completed.
 * @param {string} entityName
 * @param {Date | string | undefined} referenceStartDate
 * @param {import('pg').Client} dbClient
 * @returns {Promise<{id: number, status: string, start_date: Date} | undefined>}
 */
async function getLatestIngestStatus(entityName, referenceStartDate, dbClient) {
  const referenceDate = new Date(referenceStartDate ?? new Date())
  const {
    rows: [ingest]
  } = await dbClient.query(
    `SELECT id, status, start_date
       FROM ingest
      WHERE entity = $1
        AND start_date::date = ($2 AT TIME ZONE 'UTC')::date
      ORDER BY start_date DESC
      LIMIT 1`,
    [entityName, referenceDate]
  )
  return ingest
}

/**
 * Serializes access to a pair of coupled entities (e.g. land_parcels/land_covers) so that
 * two concurrent ingests can't race past each other when checking/updating pair state.
 * @param {string} entityName
 * @param {string} pairedEntityName
 * @param {import('pg').Client} dbClient
 */
async function acquirePairLock(entityName, pairedEntityName, dbClient) {
  const lockKey = [entityName, pairedEntityName]
    .sort((a, b) => a.localeCompare(b))
    .join('|')
  await dbClient.query('SELECT pg_advisory_xact_lock(hashtext($1))', [lockKey])
}

const TERMINAL_FAILURE_STATUSES = new Set([
  INGEST_STATUS.FAILED,
  INGEST_STATUS.CANCELLED
])

/**
 * This entity has finished staging. If its paired entity has already conclusively failed
 * this cycle, this entity is failed too (never staged/promoted). Otherwise this entity is
 * always stamped `staged`/`staged_date` first - if the paired entity is also staged, both
 * staging tables are then promoted to live in the same transaction, reusing that same
 * timestamp as `completed_date`; if not, it's simply left staged, waiting for its pair.
 * Access is serialized per-pair with an advisory lock so simultaneous completions can't
 * double-promote or miss each other. Promotion swaps the staging and live tables in place,
 * so no indexes are dropped or rebuilt and the transaction is just metadata renames.
 *
 * A finalize call for an ingest that is no longer in progress (e.g. a late/duplicate
 * finalize after the ingest was already promoted) is a no-op: the ingest is never re-staged
 * and never re-promoted, because the swap-based promotion is not idempotent and would
 * recycle/truncate the previously promoted live data.
 * @param {string} entityName
 * @param {string} pairedEntityName
 * @param {string | number} ingestId
 * @param {import('pg').Client} dbClient
 * @param {object} logger
 * @returns {Promise<boolean>} true if both tables were promoted
 * @throws {Error} if the paired entity had already conclusively failed this cycle
 */
export async function completeAndPromotePaired(
  entityName,
  pairedEntityName,
  ingestId,
  dbClient,
  logger
) {
  const now = new Date()
  let promoted = false
  let pairAlreadyFailedError

  try {
    await dbClient.query('BEGIN')
    await acquirePairLock(entityName, pairedEntityName, dbClient)

    const thisIngest = await getIngestStatusById(ingestId, dbClient)
    const pairedIngest = await getLatestIngestStatus(
      pairedEntityName,
      thisIngest?.start_date,
      dbClient
    )

    if (thisIngest && thisIngest.status !== INGEST_STATUS.IN_PROGRESS) {
      logFinalizeSkipped(entityName, ingestId, thisIngest.status, logger)
    } else if (
      pairedIngest &&
      TERMINAL_FAILURE_STATUSES.has(pairedIngest.status)
    ) {
      pairAlreadyFailedError = await failIngestWhenPairFailed({
        entityName,
        pairedEntityName,
        ingestId,
        dbClient,
        logger
      })
    } else {
      promoted = await stageIngestAndPromoteIfPaired({
        entityName,
        pairedEntityName,
        ingestId,
        pairedIngest,
        now,
        dbClient,
        logger
      })
    }

    await dbClient.query('COMMIT')
  } catch (error) {
    await dbClient.query('ROLLBACK')
    throw error
  }

  if (pairAlreadyFailedError) {
    throw pairAlreadyFailedError
  }

  return promoted
}

/**
 * Fetches the status of a specific ingest. Must be called while holding the pair's
 * advisory lock when used for pair coordination.
 * @param {string | number} ingestId
 * @param {import('pg').Client} dbClient
 * @returns {Promise<{id: number, status: string, start_date: Date} | undefined>}
 */
async function getIngestStatusById(ingestId, dbClient) {
  const {
    rows: [ingest]
  } = await dbClient.query(
    `SELECT id, status, start_date FROM ingest WHERE id = $1`,
    [ingestId]
  )
  return ingest
}

/**
 * Logs that a finalize call was skipped for an ingest that is no longer in progress
 * @param {string} entityName
 * @param {string | number} ingestId
 * @param {string} status
 * @param {object} logger
 */
function logFinalizeSkipped(entityName, ingestId, status, logger) {
  logInfo(logger, {
    category: LOG_CATEGORY,
    operation: `${entityName}_finalize_skipped`,
    message: `${entityName} ingest ${ingestId} is already ${status}; skipping finalize`,
    context: { entityName, ingestId, status }
  })
}

/**
 * Fails this ingest because its paired entity has already conclusively failed this cycle.
 * @returns {Promise<Error>} the error describing the failed pair
 */
async function failIngestWhenPairFailed({
  entityName,
  pairedEntityName,
  ingestId,
  dbClient,
  logger
}) {
  await dbClient.query(`UPDATE ingest SET status = $1 WHERE id = $2`, [
    INGEST_STATUS.FAILED,
    ingestId
  ])

  const error = new Error(
    `${entityName} cannot be promoted because its paired entity ${pairedEntityName} already failed`
  )
  logBusinessError(logger, {
    operation: `${entityName}_paired_ingest_failed`,
    error,
    context: { entityName, pairedEntityName, ingestId }
  })

  return error
}

/**
 * Marks this ingest `staged`/`staged_date`, then promotes the pair together if the paired
 * entity is also staged. When the paired entity has not finished staging this ingest is
 * simply left staged, waiting for its pair.
 * @returns {Promise<boolean>} true if both tables were promoted
 */
async function stageIngestAndPromoteIfPaired({
  entityName,
  pairedEntityName,
  ingestId,
  pairedIngest,
  now,
  dbClient,
  logger
}) {
  await dbClient.query(
    `UPDATE ingest SET status = $1, staged_date = $2 WHERE id = $3`,
    [INGEST_STATUS.STAGED, now, ingestId]
  )

  if (pairedIngest?.status === INGEST_STATUS.STAGED) {
    await promotePairedStaging({
      entityName,
      pairedEntityName,
      ingestId,
      pairedIngest,
      now,
      dbClient,
      logger
    })
    return true
  }

  logInfo(logger, {
    category: LOG_CATEGORY,
    operation: `${entityName}_awaiting_pair`,
    message: `${entityName} finished staging; waiting for ${pairedEntityName} before promoting`,
    context: { entityName, pairedEntityName, ingestId }
  })

  return false
}

/**
 * Swaps both staging tables into live and marks both ingests completed, reusing the same
 * timestamp for `completed_date`.
 */
async function promotePairedStaging({
  entityName,
  pairedEntityName,
  ingestId,
  pairedIngest,
  now,
  dbClient,
  logger
}) {
  const startTime = performance.now()

  await swapStagingWithLive(entityName, dbClient)
  await swapStagingWithLive(pairedEntityName, dbClient)
  await dbClient.query(
    `UPDATE ingest SET status = $1, completed_date = $2 WHERE id = ANY($3)`,
    [INGEST_STATUS.COMPLETED, now, [ingestId, pairedIngest.id]]
  )

  const duration = performance.now() - startTime
  logInfo(logger, {
    category: LOG_CATEGORY,
    operation: `${entityName}_paired_promotion_completed`,
    message: `${entityName} and ${pairedEntityName} promoted to live together in ${duration.toFixed(0)}ms`,
    context: { entityName, pairedEntityName, duration }
  })
}

/**
 * When this entity's ingest fails, its paired entity must not be promoted independently.
 * If the paired entity has already finished staging and is awaiting this one, fail it too.
 * @param {string} entityName
 * @param {string} pairedEntityName
 * @param {string | number} ingestId
 * @param {import('pg').Client} dbClient
 * @param {object} logger
 */
export async function failPairedAwaitingIngest(
  entityName,
  pairedEntityName,
  ingestId,
  dbClient,
  logger
) {
  try {
    await dbClient.query('BEGIN')
    await acquirePairLock(entityName, pairedEntityName, dbClient)

    const thisIngest = await getIngestStatusById(ingestId, dbClient)
    const pairedIngest = await getLatestIngestStatus(
      pairedEntityName,
      thisIngest?.start_date,
      dbClient
    )

    if (pairedIngest?.status === INGEST_STATUS.STAGED) {
      await dbClient.query(`UPDATE ingest SET status = $1 WHERE id = $2`, [
        INGEST_STATUS.FAILED,
        pairedIngest.id
      ])

      logBusinessError(logger, {
        operation: `${pairedEntityName}_paired_ingest_failed`,
        error: new Error(
          `${pairedEntityName} could not be promoted because its paired entity ${entityName} did not complete successfully`
        ),
        context: {
          entityName,
          pairedEntityName,
          pairedIngestId: pairedIngest.id
        }
      })
    }

    await dbClient.query('COMMIT')
  } catch (error) {
    await dbClient.query('ROLLBACK')
    throw error
  }
}
