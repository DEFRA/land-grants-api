import Joi from 'joi'

export const statusIngestQuery = Joi.object({
    ingestId: Joi.number(),
    filename: Joi.string().optional(),
})

export const statusFileResponseSchema = Joi.object({
    id: Joi.number().required(),
    ingest_id: Joi.number().required(),
    filename: Joi.string().required(),
    total_rows: Joi.number().required(),
    status: Joi.string().required()
})

export const statusIngestResponseSchema = Joi.object({
    id: Joi.number().required(),
    entity: Joi.string().required(),
    status: Joi.string().required(),
    start_date: Joi.date().required(),
    completed_date: Joi.string().allow(null).optional(),
    files: Joi.array().items(statusFileResponseSchema).optional()
})

export const statusResponseSchema = Joi.alternatives().try(statusIngestResponseSchema, statusFileResponseSchema)