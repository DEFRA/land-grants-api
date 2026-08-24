import Boom from '@hapi/boom'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/features/common/schema/index.js'
import {
  paymentCalculateWMPSchemaV2,
  paymentCalculateWMPResponseSchema
} from '../schema/payment-calculate-wmp.schema.js'
import {
  logInfo,
  logValidationWarn,
  logBusinessError
} from '~/src/features/common/helpers/logging/log-helpers.js'
import { statusCodes } from '~/src/features/common/constants/status-codes.js'
import { wmpPaymentCalculateTransformer } from '../transformer/wmp-payment-calculate.transformer.js'
import { validatePaymentCalculationRequest } from '../validation/payment-calculation.validation.js'
import {
  calculateWMPPaymentWithRateVersion,
  inferRateVersionSource
} from '../service/wmp-rate-version.service.js'
import { haToSqm } from '~/src/features/common/helpers/measurement.js'
import {
  AuditEvent,
  auditEvent,
  getCorrelationId
} from '../../common/helpers/audit-event.js'

/**
 * Builds the shared portion of a WMP payment calculation audit context.
 * @param {import('@hapi/hapi').Request} request
 * @param {object} params
 * @param {string[]} params.parcelIds
 * @returns {object}
 */
const buildAuditContext = (request, { parcelIds }) => ({
  correlationId: getCorrelationId(request),
  parcelIds
})

/**
 * Runs the WMP payment calculation pipeline for a validated request.
 * @param {import('@hapi/hapi').Request} request
 * @param {object} postgresDb
 * @param {object} params
 * @param {string[]} params.parcelIds
 * @param {number} params.oldWoodlandAreaHa
 * @param {number} params.newWoodlandAreaHa
 * @param {string|Date} [params.startDate]
 * @param {string} [params.version] - Exact action config semantic version to pin the rate to
 * @param {number} [params.validationRunId] - Validation run id carrying the pinned rate version
 * @returns {Promise<object | import('@hapi/boom').Boom>} Transformed payment response, or a Boom error response
 */
const runWmpPaymentCalculation = async (
  request,
  postgresDb,
  {
    parcelIds,
    oldWoodlandAreaHa,
    newWoodlandAreaHa,
    startDate,
    version,
    validationRunId
  }
) => {
  const validationResponse = await validatePaymentCalculationRequest(
    parcelIds,
    request
  )

  if (validationResponse.errors && validationResponse.errors.length > 0) {
    logValidationWarn(request.logger, {
      operation: 'Payment Calculate WMP validation',
      errors: validationResponse.errors,
      context: { parcelIds: parcelIds.join(',') }
    })
    return Boom.badRequest(validationResponse.errors.join(', '))
  }

  const calculation = await calculateWMPPaymentWithRateVersion(
    request.logger,
    postgresDb,
    {
      oldWoodlandAreaSqm: haToSqm(oldWoodlandAreaHa),
      newWoodlandAreaSqm: haToSqm(newWoodlandAreaHa)
    },
    { version, validationRunId }
  )

  if ('error' in calculation) {
    logValidationWarn(request.logger, {
      operation: 'Payment Calculate WMP rate version resolution',
      errors: [calculation.error],
      context: { parcelIds: parcelIds.join(','), validationRunId, version }
    })
    return Boom.badRequest(calculation.error)
  }

  const transformedPayment = wmpPaymentCalculateTransformer(
    parcelIds,
    calculation.paymentResult,
    calculation.action,
    startDate
  )

  return {
    transformedPayment,
    rateVersion: calculation.rateVersion.value,
    rateVersionSource: calculation.rateVersion.source
  }
}

/**
 * Handles unexpected errors thrown during WMP payment calculation: logs the
 * error, publishes a failure audit event, and returns the client-facing
 * error response.
 * @param {import('@hapi/hapi').Request} request
 * @param {Error} error
 * @returns {Promise<import('@hapi/boom').Boom>}
 */
const handleWmpPaymentCalculationError = async (request, error) => {
  /** @type {import('../wmp.d.js').WMPPaymentCalculateRequest} */
  // @ts-expect-error - payload
  const {
    parcelIds,
    oldWoodlandAreaHa,
    newWoodlandAreaHa,
    startDate,
    version,
    validationRunId
  } = request.payload
  logBusinessError(request.logger, {
    operation: 'Payment calculation: calculate wmp payment',
    error,
    context: {
      parcelIds: parcelIds.join(','),
      oldWoodlandAreaHa,
      newWoodlandAreaHa,
      startDate,
      version,
      validationRunId
    }
  })

  const rateVersionSource = inferRateVersionSource({ version, validationRunId })

  await auditEvent(
    AuditEvent.WMP_PAYMENT_CALCULATED,
    {
      ...buildAuditContext(request, { parcelIds }),
      request: {
        oldWoodlandAreaHa,
        newWoodlandAreaHa,
        startDate,
        rateVersion: version ?? null,
        rateVersionSource,
        validationRunId: validationRunId ?? null
      },
      error: error.message
    },
    'failure',
    request
  )

  return Boom.internal('Error calculating wmp payment')
}

export const PaymentsCalculateWMPController = {
  options: {
    tags: ['api'],
    description: 'Calculate WMP payment',
    notes: 'Calculates payment amounts for WMP',
    validate: {
      payload: paymentCalculateWMPSchemaV2
    },
    response: {
      status: {
        200: paymentCalculateWMPResponseSchema,
        404: errorResponseSchema,
        500: internalServerErrorResponseSchema
      }
    }
  },

  /**
   * Handler function for payment calculation
   * @param {Request} request - Hapi request object
   * @param {ResponseToolkit} h - Hapi response toolkit
   * @returns {Promise<ResponseObject | import('@hapi/boom').Boom>} Payment calculation response
   */
  handler: async (request, h) => {
    try {
      // @ts-expect-error - postgresDb
      const postgresDb = request.server.postgresDb

      /** @type {import('../wmp.d.js').WMPPaymentCalculateRequest} */
      // @ts-expect-error - payload
      const {
        parcelIds,
        oldWoodlandAreaHa,
        newWoodlandAreaHa,
        startDate,
        version,
        validationRunId
      } = request.payload

      logInfo(request.logger, {
        category: 'wmp',
        message: 'Payment Calculate WMP',
        context: {
          parcelIds,
          oldWoodlandAreaHa,
          newWoodlandAreaHa,
          startDate,
          version: version ?? null,
          validationRunId: validationRunId ?? null
        }
      })

      const calculationResult = await runWmpPaymentCalculation(
        request,
        postgresDb,
        {
          parcelIds,
          oldWoodlandAreaHa,
          newWoodlandAreaHa,
          startDate,
          version,
          validationRunId
        }
      )
      if (Boom.isBoom(calculationResult)) {
        return calculationResult
      }

      const { transformedPayment, rateVersion, rateVersionSource } =
        calculationResult

      await auditEvent(
        AuditEvent.WMP_PAYMENT_CALCULATED,
        {
          ...buildAuditContext(request, { parcelIds }),
          request: {
            oldWoodlandAreaHa,
            newWoodlandAreaHa,
            startDate,
            rateVersion,
            rateVersionSource
          },
          response: transformedPayment
        },
        'success',
        request
      )

      return h
        .response({
          message: 'success',
          payment: transformedPayment
        })
        .code(statusCodes.ok)
    } catch (error) {
      return handleWmpPaymentCalculationError(request, error)
    }
  }
}

/**
 * @import { Request, ResponseToolkit, ResponseObject } from '@hapi/hapi'
 */
