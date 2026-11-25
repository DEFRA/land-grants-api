import Boom from '@hapi/boom'
import { statusCodes } from '~/src/features/common/constants/status-codes.js'
import {
  badRequestResponseSchema,
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/features/common/schema/index.js'
import {
  parcelSupplementsSchema,
  parcelSupplementsSuccessResponseSchema
} from '~/src/features/parcel/schema/2.0.0/parcel-supplements.schema.js'
import { getDataAndValidateRequest } from '../../validation/2.0.0/parcel.validation.js'
import { getCompatibilityMatrix } from '~/src/features/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
import { getBaseCodesBySupplement } from '~/src/features/compatibility-matrix/supplements.js'
import { getSupplementsWithAvailability } from '../../service/2.0.0/supplements.service.js'
import {
  logBusinessError,
  logInfo,
  logValidationWarn
} from '~/src/features/common/helpers/logging/log-helpers.js'

/**
 * Validate that each planned action given a base action is a supplement of it.
 * @param {PlannedAction[]} plannedActions - Every action selected on the parcel
 * @param {Map<string, Set<string>>} baseCodesBySupplement - The base actions of each supplement
 * @returns {undefined | import('@hapi/boom').Boom} The error, if one is given a base action it is not a supplement of
 */
const validatePlannedSupplements = (plannedActions, baseCodesBySupplement) => {
  const misplaced = plannedActions.find(
    (p) =>
      p.baseActionCode !== undefined &&
      !baseCodesBySupplement.get(p.actionCode)?.has(p.baseActionCode)
  )

  return misplaced
    ? Boom.badRequest(
        `${misplaced.actionCode} is not a supplement of ${misplaced.baseActionCode}`
      )
    : undefined
}

/**
 * ParcelSupplementsController
 * Returns the supplementary actions of a selected base action on a land parcel
 * @satisfies {Partial<ServerRoute>}
 */
const ParcelSupplementsControllerV2 = {
  options: {
    tags: ['api'],
    description: 'Get the supplementary actions for the selected base action',
    notes:
      'Returns the supplements of the selected base action on the land parcel, each with its availability: for now, the area of the base action. Like /parcels, it reports what is available and does not judge the quantities selected: /application/validate checks those. The base action must be in plannedActions, as an area, and each planned supplement can name the base action it sits on (baseActionCode).',
    validate: {
      payload: parcelSupplementsSchema
    },
    response: {
      status: {
        200: parcelSupplementsSuccessResponseSchema,
        400: badRequestResponseSchema,
        404: errorResponseSchema,
        500: internalServerErrorResponseSchema
      }
    }
  },

  /**
   * Handler function for parcel supplements
   * @param {import('@hapi/hapi').Request} request - Hapi request object
   * @param {import('@hapi/hapi').ResponseToolkit} h - Hapi response toolkit
   * @returns {Promise<import('@hapi/hapi').ResponseObject | import('@hapi/boom').Boom>} Supplements response
   */
  handler: async (request, h) => {
    // @ts-expect-error - payload
    const { parcelId, baseActionCode, plannedActions } = request.payload
    const context = {
      parcelId,
      baseActionCode,
      plannedActions: plannedActions
        .map((planned) => planned.actionCode)
        .join(',')
    }

    try {
      logInfo(request.logger, {
        category: 'parcel',
        message: 'Fetch parcel supplements',
        context
      })

      if (!request.headers['x-forwarded-authorization']) {
        return Boom.unauthorized('X-Forwarded-Authorization is required')
      }

      const validationResponse = await getDataAndValidateRequest(
        [parcelId],
        request
      )

      if (validationResponse.errors && validationResponse.errors.length > 0) {
        logValidationWarn(request.logger, {
          operation: 'Parcel supplements validation',
          errors: validationResponse.errors,
          context
        })
        return Boom.notFound(validationResponse.errors.join(', '))
      }

      const { enabledActions } = validationResponse

      if (!enabledActions.some((a) => a.code === baseActionCode)) {
        return Boom.notFound(`Base action not found: ${baseActionCode}`)
      }

      const baseCodesBySupplement = getBaseCodesBySupplement(
        // @ts-expect-error - postgresDb
        await getCompatibilityMatrix(request.logger, request.server.postgresDb)
      )

      const plannedSupplementsError = validatePlannedSupplements(
        plannedActions,
        baseCodesBySupplement
      )
      if (plannedSupplementsError) {
        return plannedSupplementsError
      }

      const supplements = getSupplementsWithAvailability({
        baseActionCode,
        plannedActions,
        enabledActions,
        baseCodesBySupplement
      })

      const [parcel] = validationResponse.parcels

      return h
        .response({
          message: 'success',
          parcelId: parcel.parcel_id,
          sheetId: parcel.sheet_id,
          baseActionCode,
          supplements
        })
        .code(statusCodes.ok)
    } catch (error) {
      logBusinessError(request.logger, {
        operation: 'Fetch parcel supplements',
        error,
        context
      })
      return Boom.internal('Error fetching parcel supplements')
    }
  }
}

export { ParcelSupplementsControllerV2 }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 * @import { PlannedAction } from '~/src/features/parcel/schema/2.0.0/parcel-supplements.schema.js'
 */
