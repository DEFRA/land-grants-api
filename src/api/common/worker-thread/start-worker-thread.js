import { Worker } from 'node:worker_threads'
import { logInfo, logBusinessError } from '../helpers/logging/log-helpers.js'

/**
 * Start a worker
 * @param {object} request - The request object
 * @param {string} workerPath - The path to the worker file
 * @param {string} title - The title of the worker
 * @param {string} category - The category of the worker
 * @param {number} taskId - The task ID
 * @param {any} data - The data to pass to the worker
 * @returns {void}
 */
export const startWorker = (
  request,
  workerPath,
  title,
  category,
  taskId,
  data
) => {
  const worker = new Worker(workerPath, {
    workerData: {
      taskId,
      data
    }
  })

  worker.on('message', (result) => {
    logInfo(request.logger, {
      category,
      operation: `${category}_completed`,
      message: `${title} completed ${result.success ? 'successfully' : 'with errors'}`,
      context: { result: result.success, file: data }
    })
  })

  worker.on('error', (error) => {
    logBusinessError(request.logger, {
      operation: `${category}_error`,
      error,
      context: { taskId, file: data }
    })
  })

  worker.on('exit', (code) => {
    if (code === 0) {
      logInfo(request.logger, {
        category,
        operation: `${category}_exit`,
        message: `${title} exited successfully`,
        context: { taskId, code, file: data }
      })
    } else {
      logBusinessError(request.logger, {
        operation: `${category}_exit`,
        error: new Error(`${title} stopped with exit code ${code}`),
        context: { taskId, code, file: data }
      })
    }
  })
}
