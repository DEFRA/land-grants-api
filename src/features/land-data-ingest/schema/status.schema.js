import Joi from 'joi'

export const statusIngestQuery = Joi.object({
  ingestId: Joi.number().optional(),
  filename: Joi.string().optional()
}).with('filename', 'ingestId')

const statusFileResponseSchema = Joi.object({
  id: Joi.number().required(),
  ingest_id: Joi.number().required(),
  filename: Joi.string().required(),
  total_rows: Joi.number().required(),
  status: Joi.string().required()
})

const statusIngestResponseSchema = Joi.object({
  id: Joi.number().required(),
  entity: Joi.string().required(),
  status: Joi.string().required(),
  start_date: Joi.date().required(),
  completed_date: Joi.date().allow(null).optional(),
  files: Joi.array().items(statusFileResponseSchema).optional()
})

export const statusResponseSchema = Joi.alternatives().try(
  statusIngestResponseSchema,
  statusFileResponseSchema,
  Joi.array().items(statusIngestResponseSchema)
)
