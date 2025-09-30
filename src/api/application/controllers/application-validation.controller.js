import Boom from '@hapi/boom'
import {
  applicationValidationSchema,
  applicationValidationResponseSchema
} from '~/src/api/application/schema/application-validation.schema.js'
import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/api/common/schema/index.js'
import { createCompatibilityMatrix } from '~/src/available-area/compatibilityMatrix.js'
import { validateLandParcelActions } from '../service/land-parcel-validation.service.js'
import { saveApplication } from '../mutations/saveApplication.mutation.js'
import {
  errorMessagesTransformer,
  applicationDataTransformer
} from '../transformers/application.transformer.js'
import { validateRequest } from '../validation/application.validation.js'
import { getEnabledActions } from '~/src/api/actions/queries/getActions.query.js'

const ApplicationValidationController = {
  options: {
    tags: ['api'],
    description: 'Validate an application',
    notes:
      'Validates a full application including all parcels and land actions',
    validate: {
      payload: applicationValidationSchema
    },
    response: {
      status: {
        200: applicationValidationResponseSchema,
        404: errorResponseSchema,
        500: internalServerErrorResponseSchema
      }
    }
  },

  /**
   * Handler function for application validation
   * @param {import('@hapi/hapi').Request} request - Hapi request object
   * @param {import('@hapi/hapi').ResponseToolkit} h - Hapi response toolkit
   * @returns {Promise<import('@hapi/hapi').ResponseObject | import('@hapi/boom').Boom>} Validation response
   */
  handler: async (request, h) => {
    try {
      // @ts-expect-error - postgresDb is added via server decoration
      const postgresDb = request.server.postgresDb
      // @ts-expect-error - postgresDb is added via server decoration
      const { landActions, applicationId, sbi, applicantCrn, requester } =
        request.payload

      // Get all the enabled actions
      const actions = await getEnabledActions(request.logger, postgresDb)

      // Validate the entire request
      const validationErrors = await validateRequest(
        landActions,
        actions,
        request
      )

      // If there are validation errors, return a bad request response
      if (validationErrors && validationErrors.length > 0) {
        request.logger.error('Validation errors', validationErrors)
        return h
          .response({
            message: 'Application validation failed',
            valid: false,
            errorMessages: validationErrors,
            id: null
          })
          .code(statusCodes.badRequest)
      }

      // Create a compatibility check function
      const compatibilityCheckFn = await createCompatibilityMatrix(
        request.logger,
        postgresDb
      )

      // Validate each land action
      const parcelResults = await Promise.all(
        landActions.map(async (landAction) => {
          return await validateLandParcelActions(
            landAction,
            actions,
            compatibilityCheckFn,
            request
          )
        })
      )

      // Transform the application data
      const applicationData = applicationDataTransformer(
        applicationId,
        applicantCrn,
        sbi,
        requester,
        landActions,
        parcelResults
      )

      // Save the application
      const id = await saveApplication(request.logger, postgresDb, {
        application_id: applicationId,
        sbi,
        crn: applicantCrn,
        data: applicationData
      })

      // Return the application validation result
      return h
        .response({
          message: 'Application validated successfully',
          valid: applicationData.hasPassed,
          errorMessages: errorMessagesTransformer(parcelResults),
          id
        })
        .code(statusCodes.ok)
    } catch (error) {
      const errorMessage = `Error validating application: ${error.message}`
      request.logger.error(errorMessage, {
        error: error.message,
        stack: error.stack
      })
      return Boom.internal(errorMessage)
    }
  }
}

export { ApplicationValidationController }
