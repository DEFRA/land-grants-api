import Boom from '@hapi/boom'
import { applicationValidationSchema } from '../schema/application-validation.schema.js'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/api/common/schema/index.js'
import { validateLandParcelActions } from '~/src/api/actions/service/land-parcel-validation.service.js'
import { saveApplication } from '../mutations/saveApplication.mutation.js'
import { applicationTransformer } from '../transformers/application.transformer.js'
import { statusCodes } from '~/src/api/common/constants/status-codes.js'

export const ApplicationValidationController = {
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
        404: errorResponseSchema,
        500: internalServerErrorResponseSchema
      }
    }
  },
  handler: async (request, h) => {
    try {
      const { applicationId, requester, applicationCrn, landActions } =
        request.payload

      const results = []
      // validate each parcel and land action
      for (const landAction of landActions) {
        const result = await validateLandParcelActions(landAction, request)
        results.push({
          sheetId: landAction.sheetId,
          parcelId: landAction.parcelId,
          actions: result
        })
      }

      const allPassed = results.every((r) => r.actions.every((a) => a.passed))

      const applicationData = applicationTransformer({
        requester,
        hasPassed: allPassed,
        applicationCrn,
        landActions,
        validationResults: results
      })

      const id = await saveApplication(
        request.logger,
        request.server.postgresDb,
        {
          application_id: applicationId,
          sbi: landActions[0].sbi, // should pass this in the payload
          crn: applicationCrn,
          data: applicationData
        }
      )

      return h
        .response({
          message: 'Application validated successfully',
          valid: allPassed,
          id
        })
        .code(statusCodes.ok)
    } catch (error) {
      const errorMessage = 'Error validating application'
      request.logger.error(errorMessage, {
        error: error.message,
        stack: error.stack
      })
      return Boom.internal(errorMessage)
    }
  }
}
