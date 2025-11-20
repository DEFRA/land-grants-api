import { parentPort, workerData } from 'node:worker_threads'
import { getFile } from '../../common/s3/s3.js'
import { config } from '../../../config/index.js'
import { createS3Client } from '../../common/plugins/s3-client.js'
import {
  importLandCovers,
  importLandParcels,
  importMoorlandDesignations
} from '../service/import-land-data.service.js'
import { createLogger } from '../../common/helpers/logging/logger.js'
import {
  logInfo,
  logBusinessError
} from '../../common/helpers/logging/log-helpers.js'
import { parse } from 'csv-parse/sync'

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
  const category = 'import-land-data'
  const logger = createLogger()
  const s3Client = createS3Client()
  const [resourceType, ...rest] = file.split('/')
  const filename = rest.join('/')
  const s3Path = `${resourceType}/${filename}`

  logInfo(logger, {
    category,
    operation: `${resourceType}_import_started`,
    message: `${resourceType} import started`,
    context: {
      file,
      resourceType,
      filename,
      s3Path
    }
  })

  try {
    logInfo(logger, {
      category,
      operation: `${resourceType}_file_moved_to_processing`,
      message: `${resourceType} file moved to processing`,
      context: {
        s3Path
      }
    })

    const response = await getFile(s3Client, config.get('s3.bucket'), s3Path)
    const bodyContents = await response.Body.transformToString()
    const csvData = parse(bodyContents, {
      delimiter: ',',
      columns: true
    })

    logInfo(logger, {
      category,
      operation: `${resourceType}_file_get`,
      message: `${resourceType} file get successfully`,
      context: {
        data: `size: ${response.ContentLength} bytes, rows: ${csvData.length}`,
        bodyContents: bodyContents.slice(0, 100)
      }
    })

    switch (resourceType) {
      case 'parcels':
        await importLandParcels(csvData, logger)
        break
      case 'covers':
        await importLandCovers(csvData, logger)
        break
      case 'moorland':
        await importMoorlandDesignations(csvData, logger)
        break
      default:
        throw new Error(`Invalid resource type: ${resourceType}`)
    }

    logInfo(logger, {
      category,
      operation: `${resourceType}_file_moved_to_completed`,
      message: `${resourceType} file moved to completed`,
      context: {
        s3Path
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
        s3Path
      }
    })
    throw error
  }
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

// eslint-disable-next-line
ingestLandData(workerData)
