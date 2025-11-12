import Boom from '@hapi/boom'
import {
  cdpUploaderCallbackResponseSchema,
  cdpUploaderCallbackSchema
} from '../schema/land-data-ingest.schema.js'
import {
  logBusinessError,
  logInfo
} from '~/src/api/common/helpers/logging/log-helpers.js'
import { internalServerErrorResponseSchema } from '../../common/schema/index.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import {
  failedBucketPath,
  processingBucketPath,
  moveFile
} from '../../common/s3/s3.js'
import { config } from '../../../config/index.js'
import { createS3Client } from '../../common/plugins/s3-client.js'

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
    const { logger } = request
    const s3Client = createS3Client()

    /** @type { CDPUploaderRequest } */
    // @ts-expect-error - payload is validated by the schema
    const payload = request.payload

    try {
      logInfo(logger, {
        category,
        message: 'Processing land data',
        context: {
          payload: JSON.stringify(payload ?? {})
        }
      })

      await moveFile(
        s3Client,
        config.get('s3.bucket'),
        payload.form.file.s3Key,
        processingBucketPath(payload.form.file.s3Key)
      )

      logInfo(logger, {
        category,
        message: 'Land data moved to processing',
        context: {
          payload: JSON.stringify(payload ?? {}),
          sourceKey: payload.form.file.s3Key,
          destinationKey: processingBucketPath(payload.form.file.s3Key),
          s3Bucket: config.get('s3.bucket')
        }
      })

      return h.response({ message: 'Message received' }).code(statusCodes.ok)
    } catch (error) {
      await moveFile(
        s3Client,
        config.get('s3.bucket'),
        payload.form.file.s3Key,
        failedBucketPath(payload.form.file.s3Key)
      )

      logBusinessError(request.logger, {
        operation: `${category}_error`,
        error,
        context: {
          payload: JSON.stringify(payload ?? {}),
          sourceKey: payload.form.file.s3Key,
          destinationKey: failedBucketPath(payload.form.file.s3Key),
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
