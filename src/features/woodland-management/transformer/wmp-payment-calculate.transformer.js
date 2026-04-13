import {
  addDays,
  addMonths,
  addYears,
  format,
  parseISO,
  startOfMonth
} from 'date-fns'
import { roundTo4DecimalPlaces } from '../../common/helpers/measurement.js'

const DATE_FORMAT = 'yyyy-MM-dd'

/**
 * Converts a GBP amount to pence.
 * @param {number} gbp - The amount in GBP
 * @returns {number} The amount in pence
 */
const gbpToPence = (gbp) => gbp * 100

/**
 * Returns the agreement start date. When `startDate` is provided it is used as
 * an override; otherwise defaults to the 1st of next month.
 * @param {string | Date | undefined} startDate - Optional start date override. Accepts an ISO string or a Date object (e.g. produced by Joi date() coercion)
 * @returns {string} The agreement start date in YYYY-MM-DD format
 */
export const getAgreementStartDate = (startDate) => {
  if (startDate) {
    return format(new Date(startDate), DATE_FORMAT)
  }

  return format(startOfMonth(addMonths(new Date(), 1)), DATE_FORMAT)
}

/**
 * Returns the agreement end date, calculated as durationYears after the start date -1 day.
 * @param {string} agreementStartDate - The agreement start date in YYYY-MM-DD format
 * @param {number} durationYears - The duration of the agreement in years
 * @returns {string} The agreement end date in YYYY-MM-DD format
 */
export const getAgreementEndDate = (agreementStartDate, durationYears) => {
  return format(
    addDays(addYears(parseISO(agreementStartDate), durationYears), -1),
    DATE_FORMAT
  )
}

/**
 * Builds the payment schedule array from a WMP calculation result.
 * @param {WmpCalculationResult} paymentResult - The WMP calculation result
 * @param {string} agreementStartDate - The agreement start date in YYYY-MM-DD format
 * @returns {WmpPayment[]} The payment schedule
 */
export const transformPayments = (paymentResult, agreementStartDate) => {
  const paymentPence = gbpToPence(paymentResult.payment)
  return [
    {
      totalPaymentPence: paymentPence,
      paymentDate: null,
      lineItems: [
        {
          agreementLevelItemId: 1,
          paymentPence
        }
      ]
    }
  ]
}

/**
 * Builds the agreement-level items map from a WMP calculation result.
 * @param {string[]} parcelIds - The parcel IDs included in the agreement
 * @param {import('../../actions/action.d.js').Action} action - The action object
 * @param {WmpCalculationResult} paymentResult - The WMP calculation result
 * @returns {{ [id: number]: WmpAgreementLevelItem }} Agreement level items keyed by ID
 */
export const transformAgreementLevelItems = (
  parcelIds,
  action,
  paymentResult
) => {
  return {
    1: {
      code: action.code,
      description: action.description,
      version: action.semanticVersion,
      parcelIds,
      activePaymentTier: paymentResult.activePaymentTier,
      quantityInActiveTier: roundTo4DecimalPlaces(
        paymentResult.quantityInActiveTier
      ),
      activeTierRatePence: gbpToPence(paymentResult.activeTierRatePence),
      activeTierFlatRatePence: gbpToPence(
        paymentResult.activeTierFlatRatePence
      ),
      quantity: roundTo4DecimalPlaces(paymentResult.eligibleArea),
      agreementTotalPence: gbpToPence(paymentResult.payment),
      unit: 'ha'
    }
  }
}

/**
 * Transforms a WMP payment calculation result into the API response shape.
 * @param {string[]} parcelIds - The parcel IDs
 * @param {WmpCalculationResult} wmpCalculationResult - The WMP calculation result object
 * @param {import('../../actions/action.d.js').Action} action - The action object
 * @param {string | Date | undefined} startDate - Optional start date override. Accepts an ISO string or a Date object (e.g. produced by Joi date() coercion)
 * @returns {WmpPaymentCalculateResponse} The transformed payment response
 */
export const wmpPaymentCalculateTransformer = (
  parcelIds,
  wmpCalculationResult,
  action,
  startDate
) => {
  const agreementStartDate = getAgreementStartDate(startDate)
  return {
    explanations: [],
    agreementStartDate,
    agreementEndDate: getAgreementEndDate(
      agreementStartDate,
      action.durationYears
    ),
    frequency: 'Single',
    agreementTotalPence: gbpToPence(wmpCalculationResult.payment),
    parcelItems: {},
    agreementLevelItems: transformAgreementLevelItems(
      parcelIds,
      action,
      wmpCalculationResult
    ),
    payments: transformPayments(wmpCalculationResult, agreementStartDate)
  }
}

/**
 * @import { WmpCalculationResult } from '~/src/features/payments-engine/payment-methods/wmp-calculation.d.js'
 * @import { WmpPaymentCalculateResponse, WmpAgreementLevelItem, WmpPayment } from './wmp-payment-calculate.transformer.d.js'
 */
