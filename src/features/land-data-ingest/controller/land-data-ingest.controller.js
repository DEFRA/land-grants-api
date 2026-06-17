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

export const LandDataIngestController = {
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
    // @ts-expect-error
    const payload = request.payload
    const { ingestId, filename } = payload.metadata

    try {
      logInfo(logger, {
        category,
        message: 'Processing land data',
        context: {
          payload: JSON.stringify(payload ?? {})
        }
      })

      if (payload.form.file?.hasError) {
        return Boom.badRequest(payload.form.file.errorMessage)
      }

      if (payload.form.file?.fileStatus !== 'complete') {
        return Boom.badRequest('File is not ready')
      }

      const { title, taskId } = createTaskInfo(Date.now(), category)

      if (ingestId && filename) {
        // @ts-expect-error
        const isValid = await isValidIngestFile(ingestId, filename, request.server.postgresDb)
        if (!isValid) {
          logBusinessError(request.logger, {
            operation: `${category}_error`,
            error: new Error('Invalid ingest file'),
            context: {
              payload
            }
          })
          return Boom.badRequest('Invalid ingest file')
        }
      }

      processFile(
        {
          s3key: payload.form.file.s3Key,
          filename,
          ingestId
        },
        request,
        {
          category,
          title,
          taskId
        }
      ).catch((error) => {
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
