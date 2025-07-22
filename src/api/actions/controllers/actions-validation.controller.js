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
import { getLandData } from '~/src/api/parcel/queries/getLandData.query.js'
import { getMoorlandInterceptPercentage } from '~/src/api/parcel/queries/getMoorlandInterceptPercentage.js'
import { rules } from '~/src/rules-engine/rules/index.js'
import { executeRules } from '~/src/rules-engine/rulesEngine.js'
import { getAgreementsForParcel } from '../../agreements/queries/getAgreementsForParcel.query.js'
import { mergeAgreementsTransformer } from '../../agreements/transformers/agreements.transformer.js'
import { createCompatibilityMatrix } from '~/src/available-area/compatibilityMatrix.js'
import {
  getAvailableAreaDataRequirements,
  getAvailableAreaForAction
} from '~/src/available-area/availableArea.js'
import { plannedActionsTransformer } from '../../parcel/transformers/parcelActions.transformer.js'

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
      const [landAction] = landActions
      request.logger.info(
        `Controller validating land actions ${landActions?.length}`
      )

      const landParcel = await getLandData(
        landAction.sheetId,
        landAction.parcelId,
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

      const agreements = await getAgreementsForParcel(
        landAction.sheetId,
        landAction.parcelId,
        request.server.postgresDb,
        request.logger
      )

      const mergedActions = mergeAgreementsTransformer(
        agreements,
        landAction.actions.map((a) => ({
          actionCode: a.code,
          quantity: a.quantity,
          unit: 'ha'
        })) // should match parcels endpoint?
      )

      let results = []
      const compatibilityCheckFn = await createCompatibilityMatrix(
        request.logger,
        request.server.postgresDb
      )

      for (const action of landAction.actions) {
        const aacDataRequirements = await getAvailableAreaDataRequirements(
          action.code,
          landAction.sheetId,
          landAction.parcelId,
          plannedActionsTransformer(mergedActions),
          request.server.postgresDb,
          request.logger
        )

        const parcelAvailableArea = getAvailableAreaForAction(
          action.code,
          landAction.sheetId,
          landAction.parcelId,
          compatibilityCheckFn,
          plannedActionsTransformer(mergedActions),
          aacDataRequirements,
          request.logger
        )

        request.logger.info(
          `Parcel available area: ${JSON.stringify(parcelAvailableArea)}`
        )

        const intersectingAreaPercentage = await getMoorlandInterceptPercentage(
          landAction.sheetId,
          landAction.parcelId,
          request.server.postgresDb,
          request.logger
        )

        const application = applicationTransformer(
          action.quantity,
          action.code,
          sqmToHaRounded(parcelAvailableArea),
          intersectingAreaPercentage,
          agreements
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
