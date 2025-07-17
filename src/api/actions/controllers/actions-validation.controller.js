import Boom from '@hapi/boom'
import { getEnabledActions } from '~/src/api/actions/queries/getActions.query.js'
import {
  landActionSchema,
  landActionValidationResponseSchema
} from '~/src/api/actions/schema/action-validation.schema.js'
import { applicationTransformer } from '~/src/api/actions/transformers/application.transformer.js'
import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import { sqmToHaRounded } from '~/src/api/common/helpers/measurement.js'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/api/common/schema/index.js'
import { mergeLandCoverCodes } from '~/src/api/land-cover-codes/services/merge-land-cover-codes.js'
import { getLandData } from '~/src/api/parcel/queries/getLandData.query.js'
import { getMoorlandInterceptPercentage } from '~/src/api/parcel/queries/getMoorlandInterceptPercentage.js'
import { getParcelAvailableArea } from '~/src/api/parcel/queries/getParcelAvailableArea.query.js'
import { rules } from '~/src/rules-engine/rules/index.js'
import { executeRules } from '~/src/rules-engine/rulesEngine.js'
import { getLandCoversForAction } from '../../land-cover-codes/queries/getLandCoversForActions.query.js'

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

      const landParcel = await getLandData(
        landActions[0].sheetId,
        landActions[0].parcelId,
        request.server.postgresDb,
        request.logger
      )

      if (!landParcel) {
        const errorMessage = `Land parcel not found`
        request.logger.error(errorMessage)
        return Boom.notFound(errorMessage)
      }

      const actions = await getEnabledActions(request.logger)

      if (!actions || actions?.length === 0) {
        const errorMessage = 'Actions not found'
        request.logger.error(errorMessage)
        return Boom.notFound(errorMessage)
      }

      let results = []

      for (const action of landActions[0].actions) {
        const landCoverCodes = await getLandCoversForAction(
          action.code,
          request.server.postgresDb,
          request.logger
        )

        const mergedLandCoverCodes = mergeLandCoverCodes(landCoverCodes)

        const parcelAvailableArea = await getParcelAvailableArea(
          landActions[0].sheetId,
          landActions[0].parcelId,
          mergedLandCoverCodes,
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
          action.quantity,
          action.code,
          sqmToHaRounded(parcelAvailableArea),
          intersectingAreaPercentage,
          [] // TODO: get existing agreements
        )

        const ruleToExecute = actions.find((a) => a.code === action.code)

        if (ruleToExecute?.rules?.length === 0) {
          const errorMessage =
            'Error validating land actions, no rules found for action'
          request.logger.error(errorMessage)
          return Boom.notFound(errorMessage)
        }

        const result = executeRules(rules, application, ruleToExecute?.rules)
        request.logger.info(`Result: ${JSON.stringify(result)}`)

        results = results.concat(
          result.results
            .filter((r) => !r.passed)
            .map((r) => {
              return {
                code: action.code,
                description: r.message
              }
            })
        )
      }

      return h
        .response({
          message: 'success',
          valid: results.every((r) => r.passed),
          errorMessages: results
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
