import Boom from '@hapi/boom'
import {
  startIngestParamsSchema,
  startIngestRequestSchema,
  startIngestResponseSchema
} from '../schema/start-ingest.schema.js'
import { internalServerErrorResponseSchema } from '../../common/schema/index.js'
import { saveIngestStart } from '../service/start-ingest.service.js'

export const StartIngestController = {
  options: {
    tags: ['api'],
    description: 'Start land data ingest',
    notes: 'land data ingest',
    validate: {
      payload: startIngestRequestSchema,
      params: startIngestParamsSchema
    },
    response: {
      status: {
        200: startIngestResponseSchema,
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
    try {
      const entity = request.params.entity
      const {
        logger,
        // @ts-expect-error - postgresDb, payload
        server: { postgresDb },
        payload
      } = request
      const ingestId = await saveIngestStart(
        // @ts-expect-error - payload
        payload,
        entity,
        postgresDb,
        logger
      )

      return h.response({
        ingestId
      })
    } catch (error) {
      return Boom.internal('Error starting land data ingest')
    }
  }
}
