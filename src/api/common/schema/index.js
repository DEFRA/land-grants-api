import Joi from 'joi'
import { statusCodes } from '~/src/api/common/constants/status-codes.js'

/**
 * @typedef {object} ErrorResponseSchema
 * @property {number} statusCode
 * @property {string} error
 * @property {string} message
 */
const errorResponseSchema = Joi.object({
  statusCode: Joi.number().valid(statusCodes.notFound).required(),
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
  statusCode: Joi.number().valid(statusCodes.internalServerError).required(),
  error: Joi.string().required(),
  message: Joi.string().required()
})

export { errorResponseSchema, internalServerErrorResponseSchema }
