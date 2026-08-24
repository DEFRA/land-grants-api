import Boom from '@hapi/boom'
import { paymentCalculateTotalWMPSchema } from '../schema/payment-calculate-total-wmp.schema.js'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/features/common/schema/index.js'
import {
  logBusinessError,
  logInfo,
  logValidationWarn
} from '../../common/helpers/logging/log-helpers.js'
import { haToSqm } from '../../common/helpers/measurement.js'
import {
  calculateWMPPaymentWithRateVersion,
  inferRateVersionSource
} from '../service/wmp-rate-version.service.js'
import { wmpPaymentCalculateTransformer } from '../transformer/wmp-payment-calculate.transformer.js'
import { paymentCalculateWMPResponseSchema } from '../schema/payment-calculate-wmp.schema.js'
import {
  AuditEvent,
  auditEvent,
  getCorrelationId
} from '../../common/helpers/audit-event.js'

const handleWmpPaymentTotalCalculationError = async (request, error) => {
  const { totalAreaHa, applicationId, sbi, crn, version, validationRunId } =
    /** @type {import('../wmp.d.js').WMPPaymentCalculateTotalRequest} */ (
      request.payload
    )

  logBusinessError(request.logger, {
    operation: 'Payment calculation: calculate total wmp payment',
    error,
    context: {
      totalAreaHa,
      applicationId,
      sbi,
      crn,
      version,
      validationRunId
    }
  })

  const rateVersionSource = inferRateVersionSource({ version, validationRunId })

  await auditEvent(
    AuditEvent.WMP_PAYMENT_TOTAL_CALCULATED,
    {
      ...buildAuditContext(request, sbi, crn),
      request: {
        totalAreaHa,
        applicationId,
        sbi,
        crn,
        rateVersion: version ?? null,
        rateVersionSource,
        validationRunId: validationRunId ?? null
      },
      error: error.message
    },
    'failure',
    request
  )

  return Boom.internal('Error calculating wmp total payment')
}
/**
 * Builds the shared portion of a WMP payment calculation audit context.
 * @param {import('@hapi/hapi').Request} request
 * @param {string} sbi
 * @param {string} [crn]
 * @returns {object}
 */
const buildAuditContext = (request, sbi, crn) => ({
  correlationId: getCorrelationId(request),
  identifiers: { sbi, crn }
})

/**
 *
 */
export const PaymentsCalculateTotalWMPController = {
  options: {
    tags: ['api'],
    description: 'Calculate WMP payment for total area',
    notes: 'Calculates payment amounts for WMP',
    validate: {
      payload: paymentCalculateTotalWMPSchema
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
      const logger = request.logger

      /** @type {import('../wmp.d.js').WMPPaymentCalculateTotalRequest} */
      // @ts-expect-error - payload
      const {
        totalAreaHa,
        applicationId,
        sbi,
        crn,
        startDate,
        version,
        validationRunId
      } = request.payload

      logInfo(logger, {
        category: 'wmp',
        message: 'Payment Calculate total WMP',
        context: {
          totalAreaHa,
          applicationId,
          sbi,
          crn,
          version: version ?? null,
          validationRunId: validationRunId ?? null
        }
      })

      const calculation = await calculateWMPPaymentWithRateVersion(
        logger,
        postgresDb,
        { totalWoodlandAreaSqm: haToSqm(totalAreaHa) },
        { version, validationRunId, applicationId }
      )

      if ('error' in calculation) {
        logValidationWarn(logger, {
          operation: 'Payment calculation: calculate total wmp payment',
          errors: [calculation.error],
          context: { applicationId, sbi, crn, version, validationRunId }
        })
        return Boom.badRequest(calculation.error)
      }

      const transformedPaymentResult = wmpPaymentCalculateTransformer(
        [],
        calculation.paymentResult,
        calculation.action,
        startDate
      )

      await auditEvent(
        AuditEvent.WMP_PAYMENT_TOTAL_CALCULATED,
        {
          ...buildAuditContext(request, sbi, crn),
          request: {
            totalAreaHa,
            applicationId,
            sbi,
            crn,
            rateVersion: calculation.rateVersion.value,
            rateVersionSource: calculation.rateVersion.source
          },
          response: transformedPaymentResult
        },
        'success',
        request
      )

      return h.response({
        message: 'success',
        payment: transformedPaymentResult
      })
    } catch (error) {
      return handleWmpPaymentTotalCalculationError(request, error)
    }
  }
}

/**
 * @import { Request, ResponseToolkit, ResponseObject } from '@hapi/hapi'
 */
