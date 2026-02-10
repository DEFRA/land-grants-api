import Boom from '@hapi/boom'
import { config } from '~/src/config/index.js'
import {
  logBusinessError,
  logInfo
} from '~/src/features/common/helpers/logging/log-helpers.js'
import { internalServerErrorResponseSchema } from '../../common/schema/index.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { initiateLandDataUpload } from '../service/ingest.service.js'
import {
  initiateLandDataUploadRequestSchema,
  initiateLandDataUploadSuccessResponseSchema
} from '../schema/ingest.schema.js'

export const InitiateLandDataUploadController = {
  options: {
    tags: ['api'],
    description: 'Initiates land data upload',
    notes: 'Initiates land data upload',
    validate: {
      payload: initiateLandDataUploadRequestSchema
    },
    response: {
      status: {
        200: initiateLandDataUploadSuccessResponseSchema,
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
    const category = 'initiate-land-data-upload'
    const { logger, payload } = request
    // @ts-expect-error - payload is validated by the schema
    const { resource } = payload

    try {
      logInfo(logger, {
        category,
        message: 'Initiating land data upload',
        context: {
          payload: JSON.stringify(payload ?? {}),
          s3Bucket: config.get('s3.bucket'),
          endpoint: config.get('ingest.endpoint'),
          callback: config.get('ingest.callback'),
          grantsUiHost: config.get('ingest.grantsUiHost'),
          frontendUrl: process.env.FRONTEND_URL
        }
      })

      const data = await initiateLandDataUpload(
        config.get('ingest.endpoint'),
        config.get('ingest.callback'),
        config.get('s3.bucket'),
        resource,
        payload
      )

      logInfo(logger, {
        category,
        message: 'CDP uploader response',
        context: data ?? {}
      })

      const uploadUrl = `${config.get('ingest.grantsUiHost') || process.env.FRONTEND_URL}${data.uploadUrl}`

      logInfo(logger, {
        category,
        message: 'Upload URL',
        context: { uploadUrl }
      })

      return h
        .response({
          message: 'Land data upload initiated',
          uploadUrl
        })
        .code(statusCodes.ok)
    } catch (error) {
      logBusinessError(request.logger, {
        operation: `${category}_error`,
        error,
        context: {
          payload
        }
      })
      return Boom.internal('Error initiating land data upload')
    }
  }
}
