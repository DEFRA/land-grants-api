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
import { getSupplementCodesForBase } from '~/src/features/compatibility-matrix/supplements.js'
import { getSupplementsWithAvailability } from '../../service/2.0.0/supplements.service.js'
import {
  logBusinessError,
  logInfo,
  logValidationWarn
} from '~/src/features/common/helpers/logging/log-helpers.js'

/**
 * The supplements of the base action we offer, each with its availability, or
 * the selected actions that are not among them.
 * @param {object} params
 * @param {import('@hapi/hapi').Request['logger']} params.logger - Request logger
 * @param {object} params.postgresDb - Postgres connection pool
 * @param {Action[]} params.enabledActions - The enabled actions
 * @param {SelectedAction} params.baseAction - The selected base action and its area
 * @param {SelectedAction[]} params.selectedSupplements - The supplements selected so far
 * @returns {Promise<{supplements?: object[], notSupplements?: string[]}>} The supplements, or the selected codes that are not supplements
 */
const getBaseActionSupplements = async ({
  logger,
  postgresDb,
  enabledActions,
  baseAction,
  selectedSupplements
}) => {
  // Only the base action's rows; its SUPBAS rows name its supplements
  const compatibilityMatrix = await getCompatibilityMatrix(logger, postgresDb, [
    baseAction.actionCode
  ])

  // Only supplements we offer (enabled and displayed), as for hasSupplements on /parcels
  const displayedActions = enabledActions.filter((action) => action.display)

  const supplementCodes = getSupplementCodesForBase(
    compatibilityMatrix,
    baseAction.actionCode,
    displayedActions.map((action) => action.code)
  )

  const notSupplements = selectedSupplements
    .map((selected) => selected.actionCode)
    .filter((code) => !supplementCodes.has(code))

  if (notSupplements.length > 0) {
    return { notSupplements }
  }

  return {
    supplements: getSupplementsWithAvailability({
      baseAction,
      selectedSupplements,
      supplementActions: displayedActions.filter((action) =>
        supplementCodes.has(action.code)
      )
    })
  }
}

/**
 * ParcelSupplementsController
 * Returns the supplementary actions of a selected base action on a land parcel
 * @satisfies {Partial<ServerRoute>}
 */
const ParcelSupplementsControllerV2 = {
  options: {
    tags: ['api'],
    description: 'Get the supplementary actions for a selected base action',
    notes:
      'Returns the supplements of the base action on the land parcel, each with its availability. Pass the supplements selected so far to find out which of them are selected for more than the base action covers.',
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
    const { parcelId, baseAction, selectedSupplements } = request.payload
    const context = {
      parcelId,
      baseActionCode: baseAction.actionCode,
      selectedSupplements: selectedSupplements
        .map((selected) => selected.actionCode)
        .join(',')
    }

    try {
      // @ts-expect-error - postgresDb
      const postgresDb = request.server.postgresDb

      logInfo(request.logger, {
        category: 'parcel',
        message: 'Fetch parcel supplements',
        context
      })

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

      const enabledActions = validationResponse.enabledActions
      const enabledActionCodes = enabledActions.map((action) => action.code)

      if (!enabledActionCodes.includes(baseAction.actionCode)) {
        return Boom.notFound(`Base action not found: ${baseAction.actionCode}`)
      }

      const { supplements, notSupplements } = await getBaseActionSupplements({
        logger: request.logger,
        postgresDb,
        enabledActions,
        baseAction,
        selectedSupplements
      })

      if (notSupplements) {
        return Boom.badRequest(
          `Not supplements of ${baseAction.actionCode}: ${notSupplements.join(', ')}`
        )
      }

      const [parcel] = validationResponse.parcels

      return h
        .response({
          message: 'success',
          parcelId: parcel.parcel_id,
          sheetId: parcel.sheet_id,
          baseActionCode: baseAction.actionCode,
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
 * @import { Action } from '~/src/features/actions/action.d.js'
 * @typedef {{actionCode: string, quantity: number, unit: string}} SelectedAction
 */
