/* eslint-disable @typescript-eslint/require-await */
import Boom from '@hapi/boom'
import {
  cdpUploaderCallbackResponseSchema,
  cdpUploaderCallbackSchema
} from '../schema/land-data-ingest.schema.js'
import {
  logBusinessError,
  logInfo
} from '~/src/features/common/helpers/logging/log-helpers.js'
import { internalServerErrorResponseSchema } from '../../common/schema/index.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { config } from '../../../config/index.js'
import { createTaskInfo, processFile } from '../service/ingest.service.js'
import { isValidIngestFile } from '../service/start-ingest.service.js'

/**
 * Validates that the uploaded file has no errors and is complete
 * @param {object} payload - The CDP uploader callback payload
 * @returns {import('@hapi/boom').Boom | null} A Boom error if invalid, otherwise null
 */
const validateFileStatus = (payload) => {
  if (payload.form.file?.hasError) {
    return Boom.badRequest(payload.form.file.errorMessage)
  }

  if (payload.form.file?.fileStatus !== 'complete') {
    return Boom.badRequest('File is not ready')
  }

  return null
}

/**
 * Validates that the file belongs to the given ingest, if an ingest is referenced
 * @param {{ingestId: number, filename: string, postgresDb: object, logger: object, category: string, payload: object}} params
 * @returns {Promise<import('@hapi/boom').Boom | null>} A Boom error if invalid, otherwise null
 */
const validateIngestFile = async ({
  ingestId,
  filename,
  postgresDb,
  logger,
  category,
  payload
}) => {
  if (!ingestId || !filename) {
    return null
  }

  const isValid = await isValidIngestFile(ingestId, filename, postgresDb)
  if (isValid) {
    return null
  }

  logBusinessError(logger, {
    operation: `${category}_error`,
    error: new Error('Invalid ingest file'),
    context: { payload }
  })

  return Boom.badRequest('Invalid ingest file')
}

/**
 * Starts background processing of the uploaded file, logging any failure
 * @param {object} payload - The CDP uploader callback payload
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @param {{category: string, title: string, taskId: number, filename: string, ingestId: number}} params
 */
const startFileProcessing = (
  payload,
  request,
  { category, title, taskId, filename, ingestId }
) => {
  processFile({ s3key: payload.form.file.s3Key, filename, ingestId }, request, {
    category,
    title,
    taskId
  })
    .then(async () => {
      // @ts-expect-error - statistics is not typed on server.plugins
      const statistics = request.server.plugins.statistics
      if (statistics?.loadStats) {
        try {
          await statistics.loadStats()
        } catch (error) {
          request.logger.error(
            { error },
            'Failed to run statistics after successful data ingestion'
          )
        }
      }
      return null
    })
    .catch((error) => {
      logBusinessError(request.logger, {
        operation: `${category}_process_file_error`,
        error,
        context: {
          payload: JSON.stringify(payload ?? {}),
          s3Key: payload.form.file.s3Key,
          s3Bucket: config.get('s3.bucket')
        }
      })
    })
}

export const CDPUploaderCallbackController = {
  options: {
    tags: ['api'],
    description: 'Handles CDP uploader callback',
    notes: 'Starts processing of land data',
    validate: {
      payload: cdpUploaderCallbackSchema
    },
    response: {
      status: {
        200: cdpUploaderCallbackResponseSchema,
        500: internalServerErrorResponseSchema
      }
    }
  },
  /**
   * @param {import('@hapi/hapi').Request} request - Hapi request object
   * @param {import('@hapi/hapi').ResponseToolkit} h - Hapi response toolkit
   * @returns {Promise<import('@hapi/hapi').ResponseObject | import('@hapi/boom').Boom>} Validation response
   */
  handler: async (request, h) => {
    const category = 'land-data-ingest'
    const {
      logger,
      // @ts-expect-error - postgresDb, payload
      server: { postgresDb }
    } = request
    /** @type { CDPUploaderRequest } */
    // @ts-expect-error - payload
    const payload = request.payload
    const ingestId = payload?.metadata?.ingestId
    const filename = payload?.metadata?.filename

    try {
      logInfo(logger, {
        category,
        message: 'Processing land data',
        context: {
          payload: JSON.stringify(payload ?? {})
        }
      })

      const statusError = validateFileStatus(payload)
      if (statusError) {
        return statusError
      }

      const ingestError = await validateIngestFile({
        ingestId,
        filename,
        postgresDb,
        logger,
        category,
        payload
      })
      if (ingestError) {
        return ingestError
      }

      const { title, taskId } = createTaskInfo(Date.now(), category)

      startFileProcessing(payload, request, {
        category,
        title,
        taskId,
        filename,
        ingestId
      })

      logInfo(logger, {
        category,
        message: 'Land data moved to processing',
        context: {
          payload: JSON.stringify(payload ?? {}),
          s3Key: payload.form.file.s3Key,
          s3Bucket: config.get('s3.bucket')
        }
      })

      return h.response({ message: 'Message received' }).code(statusCodes.ok)
    } catch (error) {
      logBusinessError(request.logger, {
        operation: `${category}_error`,
        error,
        context: {
          payload: JSON.stringify(payload ?? {}),
          s3Key: payload.form.file.s3Key,
          s3Bucket: config.get('s3.bucket')
        }
      })

      return Boom.internal('Error processing land data')
    }
  }
}

/**
 * @import {CDPUploaderRequest} from '../land-data-ingest.d.js'
 */
