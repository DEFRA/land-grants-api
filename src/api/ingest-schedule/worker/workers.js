import { Worker } from 'worker_threads'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import {
  logInfo,
  logBusinessError
} from '../../common/helpers/logging/log-helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const workerPath = join(__dirname, 'ingest-schedule.worker.js')

export const category = 'land_data_ingest'
export const operation = `${category}_controller`

/**
 * Start a worker to ingest land data
 * @param {object} request - The request object
 * @param {number} taskId - The task ID
 * @param {string[]} files - The files to ingest
 */
export const startWorker = (request, taskId, files) => {
  const worker = new Worker(workerPath, {
    workerData: {
      taskId,
      files
    }
  })

  worker.on('message', (result) => {
    logInfo(request.logger, {
      category,
      operation: `${operation}_completed`,
      message: `Land data ingest completed ${result.success ? 'successfully' : 'with errors'}`,
      context: { result: result.success }
    })
  })

  worker.on('error', (error) => {
    logBusinessError(request.logger, {
      operation: `${operation}_error`,
      error,
      context: { taskId }
    })
  })

  worker.on('exit', (code) => {
    if (code !== 0) {
      logBusinessError(request.logger, {
        operation: `${operation}_exit`,
        error: new Error(`Land data ingest stopped with exit code ${code}`),
        context: { taskId, code }
      })
    } else {
      logInfo(request.logger, {
        category,
        operation: `${operation}_exit`,
        message: 'Land data ingest exited successfully',
        context: { taskId, code }
      })
    }
  })
}
