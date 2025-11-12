import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getFiles } from '../../common/s3/s3.js'
import { startWorker } from '../../common/worker-thread/start-worker-thread.js'
import { config } from '../../../config/index.js'

/**
 * @import { InitiateUploaderResponse, Task } from '../ingest-schedule.d.js'
 */

/**
 * Process a file
 * @param {string} filepath - The path to the file
 * @param {object} request - The request object
 * @param {string} category - The category of the worker
 * @param {string} title - The title of the worker
 * @param {number} taskId - The task ID
 * @returns {Promise<void>} Promise that resolves when the file is processed
 */
export const processFile = async (
  filepath,
  request,
  category,
  title,
  taskId
) => {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const workerPath = join(__dirname, '../workers/ingest-schedule.worker.js')
  await startWorker(request, workerPath, title, category, taskId, filepath)
}
/**
 * Process files from S3 bucket
 * @param {object} request - The request object
 * @param {string} category - The category of the worker
 * @param {string} title - The title of the worker
 * @param {number} taskId - The task ID
 * @param {string} bucket - The S3 bucket name
 * @returns {Promise<boolean>} Whether files were found
 */
export const fileProcessor = async (
  request,
  category,
  title,
  taskId,
  bucket
) => {
  const files = await getFiles(request.server.s3, bucket)

  if (files.length > 0) {
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const workerPath = join(__dirname, '../workers/ingest-schedule.worker.js')

    const workerPromises = files.map((file) =>
      startWorker(request, workerPath, title, category, taskId, file)
    )

    await Promise.all(workerPromises)
    return true
  }

  return false
}

/**
 * Create task information
 * @param {number} taskId - The task ID
 * @param {string} category - The category of the task
 * @returns {Task} The task information
 */
export const createTaskInfo = (taskId, category) => {
  const title =
    category.charAt(0).toUpperCase() +
    category.slice(1).replaceAll('_', ' ').trim()
  const bucket = config.get('s3.bucket')

  return {
    category,
    title,
    taskId,
    bucket
  }
}

/**
 * Initiate land data upload
 * @param {string} endpoint - The endpoint URL
 * @param {string} callback - The callback URL
 * @param {string} s3Bucket - The S3 bucket name
 * @param {string} s3Path - The S3 path
 * @param {object} metadata - The metadata
 * @returns {Promise<InitiateUploaderResponse>} The response from the CDP uploader
 */
export const initiateLandDataUpload = async (
  endpoint,
  callback,
  s3Bucket,
  s3Path,
  metadata
) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      redirect: '/health',
      callback,
      s3Bucket,
      s3Path,
      metadata
    })
  })

  return response.json()
}
