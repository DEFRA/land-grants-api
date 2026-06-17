import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { startWorker } from '../../common/worker-thread/start-worker-thread.js'
import { config } from '../../../config/index.js'
import { logInfo } from '../../common/helpers/logging/log-helpers.js'

/**
 * @import { InitiateUploaderResponse, Task } from '../ingest.d.js'
 */

/**
 * Process a file
 * @param {{s3key: string, filename?: string, ingestId?: number}} data
 * @param {object} request - The request object
 * @param {{title: string, category: string, taskId: number}} metadata
 * @returns {Promise<void>} Promise that resolves when the file is processed
 */
export const processFile = async (
  data,
  request,
  { category, title, taskId }
) => {
  logInfo(request.logger, {
    category,
    operation: `${category}_process_file_started`,
    message: `${category} process file started`,
    context: { filepath: data.s3key }
  })
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const workerPath = join(__dirname, '../workers/ingest.worker.js')
  return startWorker(request, workerPath, data, { title, category, taskId })
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

  const data = await response.json()

  if (!response.ok) {
    throw new Error(`Failed to initiate land data upload: ${data.message}`)
  }

  return data
}
