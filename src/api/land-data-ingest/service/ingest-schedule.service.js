import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { getFiles } from '../../common/s3/s3.js'
import { startWorker } from '../../common/worker-thread/start-worker-thread.js'
import { config } from '../../../config/index.js'

/**
 * @import { Task } from '../ingest-schedule.d.js'
 */

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

    for (const file of files) {
      startWorker(request, workerPath, title, category, taskId, file)
    }

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
    category.slice(1).replace(/_/g, ' ').trim()
  const bucket = config.get('s3.bucket')

  return {
    category,
    title,
    taskId,
    bucket
  }
}
