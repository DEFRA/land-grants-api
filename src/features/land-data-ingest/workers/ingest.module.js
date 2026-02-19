import { parentPort } from 'node:worker_threads'
import { failedBucketPath, getFile } from '../../common/s3/s3.js'
import { config } from '../../../config/index.js'
import { createS3Client } from '../../common/plugins/s3-client.js'
import { importData } from '../service/import-land-data.service.js'
import { createLogger } from '../../common/helpers/logging/logger.js'
import {
  logInfo,
  logBusinessError
} from '../../common/helpers/logging/log-helpers.js'

export const resources = [
  { name: 'land_parcels', truncateTable: false },
  { name: 'moorland_designations', truncateTable: false },
  { name: 'land_covers', truncateTable: false },
  { name: 'compatibility_matrix', truncateTable: true },
  { name: 'agreements', truncateTable: true },
  { name: 'sssi', truncateTable: false },
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

    if (response.ContentType !== 'text/csv') {
      throw new Error(`Invalid content type: ${response.ContentType}`)
    }

    const bodyContents = await response.Body.transformToWebStream()
    const resource = getResourceByType(resourceType)
    await importData(
      bodyContents,
      resource.name,
      ingestId,
      logger,
      resource.truncateTable
    )

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
