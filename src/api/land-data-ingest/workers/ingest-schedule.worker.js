import { parentPort, workerData } from 'node:worker_threads'
import {
  getFile,
  moveFile,
  completedBucketPath,
  failedBucketPath
} from '../../common/s3/s3.js'
import { config } from '../../../config/index.js'
import { createS3Client } from '../../common/plugins/s3-client.js'
import {
  importLandCovers,
  importLandParcels,
  importMoorlandDesignations
} from '../service/import-land-data.service.js'
import { createLogger } from '../../common/helpers/logging/logger.js'

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
async function importLandData(file) {
  const logger = createLogger()
  const s3Client = createS3Client()
  const dataStream = await getFile(s3Client, config.get('s3.bucket'), file)
  const [resourceType, filename] = file.split('/').splice(1) // processing/{resourceType}/{file}
  const s3Path = `${resourceType}/${filename}`

  try {
    switch (resourceType) {
      case 'parcels':
        await importLandParcels(dataStream, logger)
        break
      case 'covers':
        await importLandCovers(dataStream, logger)
        break
      case 'moorland':
        await importMoorlandDesignations(dataStream, logger)
        break
      default:
        throw new Error(`Invalid resource type: ${resourceType}`)
    }

    await moveFile(
      s3Client,
      config.get('s3.bucket'),
      file,
      completedBucketPath(s3Path)
    )

    return 'Land data imported successfully'
  } catch (error) {
    await moveFile(
      s3Client,
      config.get('s3.bucket'),
      file,
      failedBucketPath(s3Path)
    )
    throw error
  }
}

/**
 * @param {object} landData - The data to ingest
 * @returns {Promise<void>}
 */
async function ingestLandData(landData) {
  try {
    const file = landData.data
    const result = await importLandData(file)
    postMessage(landData.taskId, true, result, null)
  } catch (error) {
    postMessage(landData.taskId, false, null, error.message)
    throw error
  }
}

// eslint-disable-next-line
ingestLandData(workerData)
