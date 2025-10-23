import { parentPort, workerData } from 'worker_threads'
import { getFile } from '../../common/s3/s3.js'
import { config } from '../../../config/index.js'
import { createS3Client } from '../../common/plugins/s3-client.js'

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
  const s3Client = createS3Client()
  const data = await getFile(s3Client, config.get('s3.bucket'), file)
  return data
}

async function ingestLandData(workerData) {
  try {
    const result = await importLandData(workerData.data)
    postMessage(workerData.taskId, true, result, null)
  } catch (error) {
    postMessage(workerData.taskId, false, null, error.message)
    throw error
  }
}

await ingestLandData(workerData)
