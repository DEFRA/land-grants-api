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
   * @returns {import('@hapi/hapi').ResponseObject | import('@hapi/boom').Boom} Validation response
   */
  handler: (request, h) => {
    try {
      const { logger } = request

      /** @type { CDPUploaderRequest } */
      // @ts-expect-error - payload is validated by the schema
      const payload = request.payload

      logInfo(logger, {
        category: 'land-data-ingest',
        message: 'Processing land data',
        context: payload?.form ?? {}
      })

      return h.response({ message: 'Message received' }).code(statusCodes.ok)
    } catch (error) {
      logBusinessError(request.logger, {
        operation: 'land-data-ingest',
        error,
        context: { payload: request.payload }
      })
      return Boom.internal('Error processing land data')
    }
  }
}

/**
 * @import {CDPUploaderRequest} from '../land-data-ingest.d.js'
 */
