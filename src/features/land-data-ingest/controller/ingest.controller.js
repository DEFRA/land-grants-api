import Boom from '@hapi/boom'
import { statusCodes } from '~/src/features/common/constants/status-codes.js'
import {
  logBusinessError,
  logInfo
} from '~/src/features/common/helpers/logging/log-helpers.js'
import { createTaskInfo, processFile } from '../service/ingest.service.js'
import { internalServerErrorResponseSchema } from '~/src/features/common/schema/index.js'
import { ingestSuccessResponseSchema } from '../schema/ingest.schema.js'
import { filterFilesByDate, getFiles } from '../../common/s3/s3.js'
import { createS3Client } from '../../common/plugins/s3-client.js'

/**
 * Processes each filtered file in turn
 * @param {Array<{Key: string}>} files - The S3 files to process
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @param {{category: string, title: string, taskId: number}} taskInfo - Task metadata
 * @returns {Promise<void>}
 */
const processFiles = async (files, request, taskInfo) => {
  for (const file of files) {
    await processFile({ s3key: file.Key }, request, taskInfo)
  }
}

/**
 * Logs the outcome of a land data ingest run
 * @param {object} logger - Logger instance
 * @param {string} category - Logging category
 * @param {Array<object>} filtered - The filtered files found
 * @param {string} bucket - The S3 bucket name
 * @param {number} taskId - The task ID
 */
const logIngestResult = (logger, category, filtered, bucket, taskId) => {
  const found = filtered.length > 0

  logInfo(logger, {
    category,
    operation: found ? `${category}_new_files` : `${category}_no_new_files`,
    message: found
      ? `New files found in ${bucket} bucket`
      : `No new files found in ${bucket} bucket`,
    context: { bucket, taskId }
  })
}

/**
 * Builds the success response for a land data ingest run
 * @param {import('@hapi/hapi').ResponseToolkit} h - Hapi response toolkit
 * @param {Array<object>} filtered - The filtered files found
 * @param {string} bucket - The S3 bucket name
 * @param {string} title - The task title
 * @param {number} taskId - The task ID
 * @returns {import('@hapi/hapi').ResponseObject} The response
 */
const buildIngestResponse = (h, filtered, bucket, title, taskId) => {
  const message =
    filtered.length > 0
      ? `${title} started`
      : `No new files found in ${bucket} bucket`

  return h.response({ message, taskId }).code(statusCodes.ok)
}

export const IngestController = {
  options: {
    tags: ['api'],
    description: 'Ingest land data',
    notes: 'Ingest land data',
    response: {
      status: {
        200: ingestSuccessResponseSchema,
        500: internalServerErrorResponseSchema
      }
    }
  },
  /**
   * Handler function for ingesting land data
   * @param {import('@hapi/hapi').Request} request - Hapi request object
   * @param {import('@hapi/hapi').ResponseToolkit} h - Hapi response toolkit
   * @returns {Promise<import('@hapi/hapi').ResponseObject | import('@hapi/boom').Boom>} Validation response
   */
  handler: async (request, h) => {
    const category = 'land_data_ingest'
    const minutesToIgnore = 5
    const s3Client = createS3Client()
    const { title, taskId, bucket } = createTaskInfo(Date.now(), category)

    try {
      logInfo(request.logger, {
        category,
        operation: `${category}_start`,
        message: `Starting ${title}`,
        context: { taskId }
      })

      const files = await getFiles(s3Client, bucket)
      const filtered = filterFilesByDate(files, minutesToIgnore)

      await processFiles(filtered, request, { category, title, taskId })

      logIngestResult(request.logger, category, filtered, bucket, taskId)

      return buildIngestResponse(h, filtered, bucket, title, taskId)
    } catch (error) {
      logBusinessError(request.logger, {
        operation: `${category}_error`,
        error,
        context: {
          taskId
        }
      })
      return Boom.internal('Error ingesting land data')
    }
  }
}
