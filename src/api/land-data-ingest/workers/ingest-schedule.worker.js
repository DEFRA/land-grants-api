import { parentPort, workerData } from 'node:worker_threads'
import { getFile } from '../../common/s3/s3.js'
import { config } from '../../../config/index.js'
import { createS3Client } from '../../common/plugins/s3-client.js'
import { importLandParcels } from '../service/import-land-data.service.js'
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

  if (file.startsWith('parcels_')) {
    await importLandParcels(dataStream, logger)
  }

  return 'Land data imported successfully'
}

/**
 * @param {object} landData - The data to ingest
 * @returns {Promise<void>}
 */
async function ingestLandData(landData) {
  try {
    const result = await importLandData(landData.data)
    postMessage(landData.taskId, true, result, null)
  } catch (error) {
    postMessage(landData.taskId, false, null, error.message)
    throw error
  }
}

await ingestLandData(workerData)
