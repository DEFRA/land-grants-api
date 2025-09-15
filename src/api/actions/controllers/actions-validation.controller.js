import Boom from '@hapi/boom'
import {
  landActionSchema,
  landActionValidationResponseSchema
} from '~/src/api/actions/schema/action-validation.schema.js'
import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/api/common/schema/index.js'
import { validateLandParcelActions } from '../service/land-parcel-validation.service.js'
import { mapRuleResult } from '../transformers/validation-results.transformer.js'

/**
 * LandActionsValidateController
 * Validates if a combination of actions and quantities can be applied to a specific land parcel.
 * @satisfies {Partial<ServerRoute>}
 */
const LandActionsValidateController = {
  options: {
    tags: ['api'],
    description: 'Validate land actions',
    notes:
      'Validates if a combination of actions and quantities can be applied to a specific land parcel. Checks eligibility criteria, SSSI restrictions, and action compatibility.',
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
      const results = []

      const sbis = new Set(landActions.map((landAction) => landAction.sbi))

      if (sbis.size !== 1) {
        const errorMessage = 'All land actions must have the same SBI'
        request.logger.error(errorMessage)
        return Boom.badRequest(errorMessage)
      }

      if (!landActions || landActions.length === 0) {
        const errorMessage = 'Invalid request payload, no land actions provided'
        request.logger.error(errorMessage)
        return Boom.badRequest(errorMessage)
      }

      for (const landAction of landActions) {
        request.logger.info(
          `Controller validating land actions ${landAction.sheetId} ${landAction.parcelId}`
        )

        const validationResults = await validateLandParcelActions(
          landAction,
          request
        )
        results.push(...validationResults)
      }

      return h
        .response({
          message: 'success',
          valid: results.every((r) => r.passed),
          errorMessages: results.filter((r) => !r.passed).map(mapRuleResult)
        })
        .code(statusCodes.ok)
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Land parcel not found')
      ) {
        return Boom.notFound(error.message)
      }

      if (
        error instanceof Error &&
        error.message.includes('Actions not found')
      ) {
        return Boom.notFound(error.message)
      }

      const errorMessage = `Error validating land actions: ${error.message}`
      request.logger.error(errorMessage, {
        error: error.message,
        stack: error.stack
      })
      return Boom.internal(errorMessage)
    }
  }
}

export { LandActionsValidateController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
