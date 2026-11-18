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
import { createValidationLookups } from '~/src/features/available-area/compatibilityMatrix.js'
import { getSupplementsWithAvailability } from '../../service/2.0.0/supplements.service.js'
import { getUnitByActionCode } from '~/src/features/common/helpers/action-unit.js'
import { isAreaUnit } from '~/src/features/common/constants/unit_type.js'
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
 * The supplements of the selected base action that we offer, each with its
 * availability, or the problem with a supplement's base action if there is one.
 * @param {object} params
 * @param {import('@hapi/hapi').Request} params.request - Hapi request object
 * @param {Action[]} params.enabledActions - The enabled actions
 * @param {LandParcelDb} params.parcel - The parcel
 * @param {string} params.defraIdToken - The end user's Defra ID token
 * @returns {Promise<{problem?: string, supplements?: object[]}>} The supplements, or the problem
 */
const getBaseActionSupplements = async ({
  request,
  enabledActions,
  parcel,
  defraIdToken
}) => {
  const { sbi, baseAction, plannedActions } = /** @type {any} */ (
    request.payload
  )

  const { compatibilityCheckFn, baseCodesBySupplement } =
    await createValidationLookups(
      request.logger,
      // @ts-expect-error - postgresDb
      request.server.postgresDb
    )

  const problem = supplementBaseActionProblem(
    plannedActions,
    baseCodesBySupplement
  )
  if (problem) {
    return { problem }
  }

  // Only supplements we offer (enabled and displayed), as for hasSupplements on /parcels
  const supplementActions = enabledActions.filter(
    (action) =>
      action.display && baseCodesBySupplement.get(action.code)?.has(baseAction)
  )

  return {
    supplements: await getSupplementsWithAvailability({
      parcel,
      baseActionCode: baseAction,
      plannedActions,
      supplementActions,
      baseCodesBySupplement,
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
 * What is wrong with the request's base actions, if anything: the base action
 * must be in the planned actions, which give its area, with an area greater
 * than zero, and so must the base action each planned supplement sits on.
 * @param {string} baseAction - The selected base action
 * @param {PlannedAction[]} plannedActions - Every action selected on the parcel
 * @returns {string | undefined} The problem, if any
 */
const baseActionProblem = (baseAction, plannedActions) => {
  const planned = plannedActions.find((p) => p.actionCode === baseAction)

  if (!planned) {
    return `Base action missing from plannedActions: ${baseAction}`
  }

  if (!isAreaUnit(planned.unit) || !(Number(planned.quantity) > 0)) {
    return `Base action must be given as an area greater than zero, in ha or sqm: ${baseAction}`
  }

  const unplannedBase = plannedActions.find(
    (p) =>
      p.baseAction !== undefined &&
      !plannedActions.some((other) => other.actionCode === p.baseAction)
  )

  return unplannedBase
    ? `${unplannedBase.actionCode}'s baseAction ${unplannedBase.baseAction} is not in plannedActions`
    : undefined
}

/**
 * A planned action given a base action it is not a supplement of, if any.
 * @param {PlannedAction[]} plannedActions - Every action selected on the parcel
 * @param {Map<string, Set<string>>} baseCodesBySupplement - The base actions of each supplement
 * @returns {string | undefined} The problem, if any
 */
const supplementBaseActionProblem = (plannedActions, baseCodesBySupplement) => {
  const misplaced = plannedActions.find(
    (p) =>
      p.baseAction !== undefined &&
      !baseCodesBySupplement.get(p.actionCode)?.has(p.baseAction)
  )

  return misplaced
    ? `${misplaced.actionCode} is not a supplement of ${misplaced.baseAction}`
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
      "Returns the supplements of the selected base action on the land parcel, each with its availability: how much it could cover, given every other action selected on the parcel (the supplements among them) and the business's existing agreements, and no more than what the base action has left for it once the supplements on it have their share. Like /parcels, it reports what is available and does not judge the quantities selected: /application/validate checks those. The base action must be in plannedActions, as an area, and each planned supplement can name the base action it sits on (baseAction).",
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
    const { parcelId, baseAction, plannedActions } = request.payload
    const context = {
      parcelId,
      baseActionCode: baseAction,
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

      const problem = baseActionProblem(baseAction, plannedActions)
      if (problem) {
        return Boom.badRequest(problem)
      }

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

      if (!enabledActions.some((a) => a.code === baseAction)) {
        return Boom.notFound(`Base action not found: ${baseAction}`)
      }

      const [parcel] = validationResponse.parcels

      const { problem: supplementProblem, supplements } =
        await getBaseActionSupplements({
          request,
          enabledActions,
          parcel,
          defraIdToken
        })
      if (supplementProblem) {
        return Boom.badRequest(supplementProblem)
      }

      return h
        .response({
          message: 'success',
          parcelId: parcel.parcel_id,
          sheetId: parcel.sheet_id,
          baseActionCode: baseAction,
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

/**
 * @typedef {object} PlannedAction
 * @property {string} actionCode
 * @property {number} quantity
 * @property {string} unit
 * @property {string} [baseAction] - For a supplement, the base action it sits on
 */
