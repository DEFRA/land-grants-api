import Boom from "@hapi/boom"
import { logBusinessError } from "../../common/helpers/logging/log-helpers.js"
import { errorResponseSchema, internalServerErrorResponseSchema } from "../../common/schema/index.js"
import { statusIngestQuery, statusResponseSchema } from "../schema/status.schema.js"
import { getIngestById } from "../service/start-ingest.service.js"

export const StatusIngestController = {
    options: {
        tags: ['api'],
        description: 'Get land data ingest status',
        notes: 'Get land data ingest status',
        validate: {
            query: statusIngestQuery
        },
        response: {
            status: {
                200: statusResponseSchema,
                404: errorResponseSchema,
                500: internalServerErrorResponseSchema
            }
        }
    },
    handler: async (request, h) => {
        const { logger, server: { postgresDb }, query } = request
        const { ingestId, filename } = query

        try {
            const ingest = await getIngestById(ingestId, postgresDb)
            if (!ingest) {
                return Boom.notFound('Ingest not found')
            }

            if (filename) {
                const fileStatus = ingest.files.find(f => f.filename === filename)
                if (!fileStatus) {
                    return Boom.notFound('Ingest file not found')
                }
                return h.response(fileStatus)
            }
            return h.response(ingest)
        } catch (error) {
            logBusinessError(logger, {
                operation: 'status_ingest_endpoint',
                context: {
                    query
                },
                error
            })
            return Boom.internal('Error getting land data ingest status')
        }
    }
}