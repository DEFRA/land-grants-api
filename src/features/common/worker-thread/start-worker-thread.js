import { Worker } from 'node:worker_threads'
import { logInfo, logBusinessError } from '../helpers/logging/log-helpers.js'

/**
 * Start a worker
 * @param {object} request - The request object
 * @param {string} workerPath - The path to the worker file
 * @param {{s3key: string, filename?: string, ingestId?: number}} data - The data to pass to the worker
 * @param {{title: string, category: string, taskId: number}} metadata
 * @returns {Promise<{dataChanged: boolean}>} Promise that resolves when the worker exits, with whether an entity's live table was updated
 */
export const startWorker = (
  request,
  workerPath,
  data,
  { title, category, taskId }
) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, {
      env: { ...process.env },
      workerData: {
        taskId,
        data
      }
    })

    let dataChanged = false

    worker.on('message', (result) => {
      dataChanged = Boolean(result.dataChanged)
      logInfo(request.logger, {
        category,
        operation: `${category}_completed`,
        message: `${title} completed ${result.success ? 'successfully' : 'with errors'}`,
        context: { result: result.success, file: data.s3key }
      })
    })

    worker.on('error', (/** @type {Error} */ error) => {
      logBusinessError(request.logger, {
        operation: `${category}_error`,
        error,
        context: { taskId, file: data.s3key }
      })
      reject(error)
    })

    worker.on('exit', (code) => {
      if (code === 0) {
        logInfo(request.logger, {
          category,
          operation: `${category}_exit`,
          message: `${title} exited successfully`,
          context: { taskId, code, file: data.s3key }
        })
        resolve({ dataChanged })
      } else {
        const error = new Error(`${title} stopped with exit code ${code}`)
        logBusinessError(request.logger, {
          operation: `${category}_exit`,
          error,
          context: { taskId, code, file: data.s3key }
        })
        reject(error)
      }
    })
  })
}
