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
import { createSupplementLookups } from '~/src/features/available-area/compatibilityMatrix.js'
import { getSupplementsWithAvailability } from '../../service/2.0.0/supplements.service.js'
import { getUnitByActionCode } from '~/src/features/common/helpers/action-unit.js'
import {
  getAgreements,
  agreementsForParcel
} from '~/src/features/agreements/repo.js'
import { expiredActionsFilter } from '~/src/features/agreements/transformers/filters.js'
import {
  logBusinessError,
  logInfo,
  logValidationWarn
} from '~/src/features/common/helpers/logging/log-helpers.js'

/**
 * The current agreements on the parcel, as /parcels reads them.
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @param {string} sbi - The business owning the parcel
 * @param {LandParcelDb} parcel - The parcel
 * @param {string} defraIdToken - The end user's Defra ID token
 * @returns {Promise<AgreementAction[]>} The parcel's current agreements
 */
const getCurrentAgreements = async (request, sbi, parcel, defraIdToken) => {
  const agreements = await getAgreements(
    sbi,
    [[parcel.parcel_id, parcel.sheet_id]],
    { type: 'external', value: defraIdToken },
    // @ts-expect-error - postgresDb
    request.server.postgresDb,
    request.logger
  )

  return agreementsForParcel(agreements, {
    parcelId: parcel.parcel_id,
    sheetId: parcel.sheet_id
  }).filter((agreementAction) => expiredActionsFilter(agreementAction))
}

/**
 * The supplements of the base action we offer, each with its availability, or
 * the selected actions that are not among them.
 * @param {object} params
 * @param {import('@hapi/hapi').Request} params.request - Hapi request object
 * @param {Action[]} params.enabledActions - The enabled actions
 * @param {LandParcelDb} params.parcel - The parcel
 * @param {string} params.defraIdToken - The end user's Defra ID token
 * @returns {Promise<{supplements?: object[], notSupplements?: string[]}>} The supplements, or the selected codes that are not supplements
 */
const getBaseActionSupplements = async ({
  request,
  enabledActions,
  parcel,
  defraIdToken
}) => {
  const { sbi, baseAction, selectedSupplements, plannedActions } =
    /** @type {any} */ (request.payload)

  // Only supplements we offer (enabled and displayed), as for hasSupplements on /parcels
  const displayedActions = enabledActions.filter((action) => action.display)

  const { compatibilityCheckFn, supplementCodes } =
    await createSupplementLookups(
      request.logger,
      // @ts-expect-error - postgresDb
      request.server.postgresDb,
      baseAction.actionCode,
      displayedActions.map((action) => action.code)
    )

  const notSupplements = selectedSupplements
    .map((selected) => selected.actionCode)
    .filter((code) => !supplementCodes.has(code))

  if (notSupplements.length > 0) {
    return { notSupplements }
  }

  const supplementActions = displayedActions.filter((action) =>
    supplementCodes.has(action.code)
  )

  return {
    supplements: await getSupplementsWithAvailability({
      parcel,
      baseAction,
      selectedSupplements,
      plannedActions: plannedActions ?? [],
      supplementActions,
      unitByActionCode: getUnitByActionCode(enabledActions),
      compatibilityCheckFn,
      agreements:
        supplementActions.length > 0
          ? await getCurrentAgreements(request, sbi, parcel, defraIdToken)
          : [],
      request
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
      "Returns the supplements of the base action on the land parcel, each with its availability: how much it could cover, given the other actions selected on the parcel and the business's existing agreements, and no more than the base action's area. Like /parcels, it reports what is available and does not judge the quantities selected: /application/validate checks those. Each selected supplement must be a supplement of the base action.",
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
      logInfo(request.logger, {
        category: 'parcel',
        message: 'Fetch parcel supplements',
        context
      })

      const defraIdToken = /** @type {string} */ (
        request.headers['x-forwarded-authorization']
      )
      if (!defraIdToken) {
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

      if (!enabledActions.some((a) => a.code === baseAction.actionCode)) {
        return Boom.notFound(`Base action not found: ${baseAction.actionCode}`)
      }

      const [parcel] = validationResponse.parcels

      const { supplements, notSupplements } = await getBaseActionSupplements({
        request,
        enabledActions,
        parcel,
        defraIdToken
      })

      if (notSupplements) {
        return Boom.badRequest(
          `Not supplements of ${baseAction.actionCode}: ${notSupplements.join(', ')}`
        )
      }

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
 * @import { AgreementAction } from '~/src/features/agreements/agreements.d.js'
 * @import { LandParcelDb } from '~/src/features/parcel/parcel.d.js'
 */
