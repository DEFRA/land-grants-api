import Joi from 'joi'

/**
 * @typedef {object} ErrorResponseSchema
 * @property {number} statusCode
 * @property {string} error
 * @property {string} message
 */
const errorResponseSchema = Joi.object({
  statusCode: Joi.number().valid(404).required(),
  error: Joi.string().required(),
  message: Joi.string().required()
})

/**
 * @typedef {object} InternalServerErrorResponseSchema
 * @property {number} statusCode
 * @property {string} error
 * @property {string} message
 */
const internalServerErrorResponseSchema = Joi.object({
  statusCode: Joi.number().valid(500).required(),
  error: Joi.string().required(),
  message: Joi.string().required()
})

export { errorResponseSchema, internalServerErrorResponseSchema }
