import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import { validateLandActions } from '~/src/api/actions/service/land-actions.service.js'
import {
  landActionSchema,
  landActionValidationResponseSchema
} from '~/src/api/actions/schema/action-validation.schema.js'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/api/common/schema/index.js'

/**
 * LandActionsValidateController
 * Finds all entries in a mongodb collection
 * @satisfies {Partial<ServerRoute>}
 */
const LandActionsValidateController = {
  options: {
    tags: ['api'],
    description: 'Validate land actions',
    notes:
      'Validates if an action can be applied to a specific land parcel. Checks eligibility criteria, SSSI restrictions, and action compatibility.',
    validate: {
      payload: landActionSchema
    },
    response: {
      status: {
        200: landActionValidationResponseSchema,
        404: errorResponseSchema,
        500: internalServerErrorResponseSchema
      }
    }
  },

  handler: async (request, h) => {
    try {
      const { landActions } = request.payload
      request.logger.info(`Controller validating land actions ${landActions}`)
      const validationResponse = await validateLandActions(
        landActions,
        request.logger
      )

      return h
        .response({ message: 'success', ...validationResponse })
        .code(statusCodes.ok)
    } catch (error) {
      request.logger.error(`Error validating land actions: ${error.message}`)
      return h
        .response({
          message: error.message
        })
        .code(statusCodes.notFound)
    }
  }
}

export { LandActionsValidateController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
