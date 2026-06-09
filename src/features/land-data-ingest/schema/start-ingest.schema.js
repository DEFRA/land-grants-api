import Joi from 'joi'
import { entityTypes } from '../../common/constants/entity_types.js'

const ingestFileSchema = Joi.object({
  filename: Joi.string().required(),
  rows: Joi.number().required()
})

export const startIngestRequestSchema = Joi.object({
  files: Joi.array().items(ingestFileSchema).required()
})

export const startIngestParamsSchema = Joi.object({
  entity: Joi.string()
    .valid(...entityTypes)
    .required()
})

export const startIngestResponseSchema = Joi.object({
  ingestId: Joi.number().required()
})
