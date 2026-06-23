import { parentPort } from 'node:worker_threads'
import { Readable } from 'node:stream'
import { failedBucketPath, getFile } from '../../common/s3/s3.js'
import unzipper from 'unzipper'
import { config } from '../../../config/index.js'
import { createS3Client } from '../../common/plugins/s3-client.js'
import { importData } from '../service/import-land-data.service.js'
import { createLogger } from '../../common/helpers/logging/logger.js'
import {
  logInfo,
  logBusinessError
} from '../../common/helpers/logging/log-helpers.js'
import { metricsCounter } from '../../common/helpers/metrics.js'
import { getEntityByName } from '~/src/features/common/constants/entity_types.js'
import { getDBOptions, createDBPool } from '../../common/helpers/postgres.js'
import { createSecureContext } from '../../common/helpers/secure-context/secure-context.js'
import { getEntityNameForIngest } from '../service/start-ingest.service.js'

/**
 * Get resource by type
 * @param {string} entityName - The entity name
 * @returns {object} The resource
 */
export const getEntityType = (entityName) => {
  const entityType = getEntityByName(entityName)
  if (!entityType) {
    throw new Error(`Entity type ${entityName} not found`)
  }
  return entityType
}

/**
 * Resolve the entity type for an ingest by looking up its entity in the database
 * @param {string | number} ingestId - The ingest ID
 * @param {import('../../common/logger.d.js').Logger} logger - The logger
 * @returns {Promise<object>} The resolved entity type
 */
export const getEntityTypeForIngest = async (ingestId, logger) => {
  const dbOptions = getDBOptions()
  const connection = createDBPool(dbOptions, {
    secureContext: createSecureContext(logger),
    logger
  })
  const client = await connection.connect()

  try {
    const entityName = await getEntityNameForIngest(ingestId, client)
    if (!entityName) {
      throw new Error(`Ingest ${ingestId} not found`)
    }
    return getEntityType(entityName)
  } finally {
    await client.end()
  }
}

/**
 * Post a message to the parent thread
 * @param {string} taskId - The task ID
 * @param {boolean} success - Whether the task was successful
 * @param {string | null} result - The result of the task
 * @param {string | null} error - The error message
 */
const postMessage = (taskId, success, result, error) => {
  parentPort?.postMessage({
    taskId,
    completedAt: new Date().toISOString(),
    success,
    result,
    error
  })
}

/**
 * Import a CSV response body directly into the database.
 * @param {object} response - The S3 response object
 * @param {EntityType} entityType - The table name to import data into
 * @param {string | number} ingestId - The ingest ID
 * @param {string | undefined} filename
 * @param {import('../../common/logger.d.js').Logger} logger - The logger
 * @returns {Promise<void>}
 */
async function handleCsvFile(response, entityType, ingestId, filename, logger) {
  const stream = Readable.fromWeb(response.Body.transformToWebStream())
  await importData(stream, entityType, ingestId, filename, logger)
}

/**
 * Find the first CSV entry in a zip response and import it, keeping the entry
 * stream consumed inside the for-await loop to prevent early iterator return
 * from destroying the underlying zip stream mid-read.
 * @param {object} response - The S3 response object
 * @param {EntityType} entityType - The table name to import data into
 * @param {string | number} ingestId - The ingest ID
 * @param {string | undefined} filename
 * @param {import('../../common/logger.d.js').Logger} logger - The logger
 * @returns {Promise<void>}
 */
async function handleZipFile(response, entityType, ingestId, filename, logger) {
  try {
    const stream = Readable.fromWeb(response.Body.transformToWebStream())
    const zip = stream.pipe(unzipper.Parse({ forceStream: true }))
    for await (const entry of zip) {
      if (entry.path.endsWith('.csv')) {
        await importData(entry, entityType, ingestId, filename, logger)
        return
      }
      entry.autodrain()
    }
    throw new Error('No CSV found in the ZIP')
  } catch (error) {
    logBusinessError(logger, {
      operation: 'error importing land data',
      error,
      context: {
        entityName: entityType.name,
        ingestId,
        truncateTable: entityType.truncateTable
      }
    })
    throw error
  }
}

/**
 * Import land data from S3 bucket
 * @param {{s3key: string, filename?: string, ingestId?: number}} data
 * @returns {Promise<string>} The string representation of the file
 */
export async function importLandData(data) {
  const { s3key, filename: originalFilename, ingestId: providedIngestId } = data

  const category = 'import-land-data'
  const logger = createLogger()
  const s3Client = createS3Client()
  const bucket = config.get('s3.bucket')
  const [resourceType, ...rest] = s3key.split('/')
  const ingestId = providedIngestId ?? rest?.[0] ?? ''
  const filename = rest.join('/')
  const s3Path = `${resourceType}/${filename}`

  logInfo(logger, {
    category,
    operation: `${resourceType}_import_started`,
    message: `${resourceType} import started`,
    context: {
      ingestId,
      file: s3key,
      resourceType,
      filename,
      s3Path,
      bucket
    }
  })

  try {
    const response = await getFile(s3Client, bucket, s3Path)
    const resource = providedIngestId
      ? await getEntityTypeForIngest(providedIngestId, logger)
      : getEntityType(resourceType)

    if (response.ContentType === 'application/zip') {
      await handleZipFile(
        response,
        resource,
        ingestId,
        originalFilename,
        logger
      )
    } else if (response.ContentType === 'text/csv') {
      await handleCsvFile(
        response,
        resource,
        ingestId,
        originalFilename,
        logger
      )
    } else {
      throw new Error(`Invalid content type: ${response.ContentType}`)
    }

    logInfo(logger, {
      category,
      operation: `${resourceType}_file_get`,
      message: `${resourceType} file get successfully`,
      context: {
        data: `size: ${response.ContentLength} bytes, type: ${response.ContentType}`
      }
    })

    return 'Land data imported successfully'
  } catch (error) {
    logBusinessError(logger, {
      operation: 'error importing land data',
      error,
      context: {
        category,
        resourceType,
        s3Path,
        failedBucketPath: failedBucketPath(s3Path),
        bucket
      }
    })
    await metricsCounter('land_data_ingest_failed', 1)

    throw error
  }
}

/**
 * @param {{taskId: string, data: {s3key: string, filename?: string, ingestId?: number}}} landData - The data to ingest
 * @returns {Promise<void>}
 */
export async function ingestLandData(landData) {
  try {
    const result = await importLandData(landData.data)
    postMessage(landData.taskId, true, result, null)
  } catch (error) {
    postMessage(landData.taskId, false, null, error.message)
    throw error
  }
}

/**
 * @import { EntityType } from '../../common/common.d.js'
 */
