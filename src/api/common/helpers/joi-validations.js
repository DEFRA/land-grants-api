// src/api/common/helpers/validation-helpers.js (or similar path)
import Boom from '@hapi/boom'

/**
 * Custom fail action handler for Joi validation that returns 422 for negative quantity errors
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @param {import('@hapi/hapi').ResponseToolkit} h - Hapi response toolkit
 * @param {Error | undefined} err - Validation error
 */
const quantityValidationFailAction = (request, h, err) => {
  const error = /** @type {Joi.ValidationError} */ (err)
  if (error.details) {
    const hasQuantityError = error.details.some(
      (detail) =>
        detail.path.includes('quantity') &&
        (detail.type === 'number.positive' || detail.type === 'number.base')
    )

    if (hasQuantityError) {
      throw Boom.boomify(new Error('Quantity must be a positive number'), {
        statusCode: 422
      })
    }
  }

  throw Boom.badRequest('Invalid request payload input')
}

export { quantityValidationFailAction }

/**
 * @import Joi from 'joi'
 */
