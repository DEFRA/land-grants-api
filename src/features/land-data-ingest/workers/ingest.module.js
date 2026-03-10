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

export const resources = [
  { name: 'land_parcels', truncateTable: false },
  { name: 'moorland_designations', truncateTable: false },
  { name: 'land_covers', truncateTable: false },
  { name: 'compatibility_matrix', truncateTable: true },
  { name: 'agreements', truncateTable: true },
  { name: 'sssi', truncateTable: false },
  { name: 'registered_battlefields', truncateTable: false },
  { name: 'shine', truncateTable: false },
  { name: 'scheduled_monuments', truncateTable: false },
  { name: 'registered_parks_gardens', truncateTable: false }
]

/**
 * Get resource by type
 * @param {string} resourceType - The resource type
 * @returns {object} The resource
 */
export const getResourceByType = (resourceType) => {
  const resource = resources.find((r) => r.name === resourceType)
  if (!resource) {
    throw new Error(`Resource type ${resourceType} not found`)
  }
  return resource
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
 * @param {string} tableName - The table name to import data into
 * @param {string} ingestId - The ingest ID
 * @param {import('../../common/logger.d.js').Logger} logger - The logger
 * @param {boolean} truncateTable - Whether to truncate the table before inserting
 * @returns {Promise<void>}
 */
async function handleCsvFile(
  response,
  tableName,
  ingestId,
  logger,
  truncateTable
) {
  const stream = Readable.fromWeb(response.Body.transformToWebStream())
  await importData(stream, tableName, ingestId, logger, truncateTable)
}

/**
 * Find the first CSV entry in a zip response and import it, keeping the entry
 * stream consumed inside the for-await loop to prevent early iterator return
 * from destroying the underlying zip stream mid-read.
 * @param {object} response - The S3 response object
 * @param {string} tableName - The table name to import data into
 * @param {string} ingestId - The ingest ID
 * @param {import('../../common/logger.d.js').Logger} logger - The logger
 * @param {boolean} truncateTable - Whether to truncate the table before inserting
 * @returns {Promise<void>}
 */
async function handleZipFile(
  response,
  tableName,
  ingestId,
  logger,
  truncateTable
) {
  const zip = response.Body.pipe(unzipper.Parse({ forceStream: true }))
  for await (const entry of zip) {
    if (entry.path.endsWith('.csv')) {
      await importData(entry, tableName, ingestId, logger, truncateTable)
      return
    }
    entry.autodrain()
  }
  throw new Error('No CSV found in the ZIP')
}

/**
 * Import land data from S3 bucket
 * @param {string} file - The file to import
 * @returns {Promise<string>} The string representation of the file
 */
export async function importLandData(file) {
  const category = 'import-land-data'
  const logger = createLogger()
  const s3Client = createS3Client()
  const bucket = config.get('s3.bucket')
  const [resourceType, ...rest] = file.split('/')
  const ingestId = rest?.[0] || ''
  const filename = rest.join('/')
  const s3Path = `${resourceType}/${filename}`

  logInfo(logger, {
    category,
    operation: `${resourceType}_import_started`,
    message: `${resourceType} import started`,
    context: {
      ingestId,
      file,
      resourceType,
      filename,
      s3Path,
      bucket
    }
  })

  try {
    const response = await getFile(s3Client, bucket, s3Path)
    const resource = getResourceByType(resourceType)

    if (response.ContentType === 'application/zip') {
      await handleZipFile(
        response,
        resource.name,
        ingestId,
        logger,
        resource.truncateTable
      )
    } else if (response.ContentType === 'text/csv') {
      await handleCsvFile(
        response,
        resource.name,
        ingestId,
        logger,
        resource.truncateTable
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
 * @param {object} landData - The data to ingest
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
