import Boom from '@hapi/boom'
import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import {
  landActionSchema,
  landActionValidationResponseSchema
} from '~/src/api/actions/schema/action-validation.schema.js'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/api/common/schema/index.js'
import { getMoorlandInterceptPercentage } from '~/src/api/parcel/queries/getMoorlandInterceptPercentage.js'
import { executeRules } from '~/src/rules-engine/rulesEngine.js'
import { getActions } from '~/src/api/actions/queries/getActions.query.js'
import { rules } from '~/src/rules-engine/rules/index.js'
import { applicationTransformer } from '~/src/api/actions/transformers/application.transformer.js'
import { getParcelAvailableArea } from '~/src/api/land/queries/getParcelAvailableArea.query.js'

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
      request.logger.info(
        `Controller validating land actions ${landActions?.length}`
      )

      const actions = await getActions(request.logger)
      request.logger.info(`Actions: ${actions?.length}`)

      const parcelAvailableArea = await getParcelAvailableArea(
        landActions[0].sheetId,
        landActions[0].parcelId,
        actions.find((a) => a.code === landActions[0].actions[0].code)
          .landCoverClassCodes,
        request.server.postgresDb,
        request.logger
      )

      request.logger.info(`Parcel available area: ${parcelAvailableArea}`)

      const intersectingAreaPercentage = await getMoorlandInterceptPercentage(
        landActions[0].sheetId,
        landActions[0].parcelId,
        request.server.postgresDb,
        request.logger
      )

      const application = applicationTransformer(
        parcelAvailableArea,
        landActions[0].actions[0].code,
        landActions[0].actions[0].quantity,
        intersectingAreaPercentage,
        [] // TODO: get existing agreements
      )

      const ruleToExecute = actions.find(
        (a) => a.code === landActions[0].actions[0].code
      )

      if (ruleToExecute?.rules?.length === 0) {
        const errorMessage =
          'Error validating land actions, no rules found for action'
        request.logger.error(errorMessage)
        return Boom.badRequest(errorMessage)
      }

      const result = executeRules(rules, application, ruleToExecute?.rules)
      request.logger.info(`Result: ${JSON.stringify(result)}`)

      return h
        .response({
          message: 'success',
          valid: result.passed,
          errorMessages: result.results
            .filter((r) => !r.passed)
            .map((r) => {
              return {
                code: r.name,
                description: r.message
              }
            })
        })
        .code(statusCodes.ok)
    } catch (error) {
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
