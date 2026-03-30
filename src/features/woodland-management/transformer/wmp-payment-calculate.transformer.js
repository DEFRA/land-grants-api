import { addMonths, addYears, format, parseISO, startOfMonth } from 'date-fns'

const DATE_FORMAT = 'yyyy-MM-dd'

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
 * Returns the agreement end date, calculated as durationYears after the start date.
 * @param {string} agreementStartDate - The agreement start date in YYYY-MM-DD format
 * @param {number} durationYears - The duration of the agreement in years
 * @returns {string} The agreement end date in YYYY-MM-DD format
 */
export const getAgreementEndDate = (agreementStartDate, durationYears) => {
  return format(
    addYears(parseISO(agreementStartDate), durationYears),
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
  return [
    {
      totalPaymentPence: paymentResult.payment,
      paymentDate: agreementStartDate,
      lineItems: [
        {
          agreementLevelItemId: 1,
          paymentPence: paymentResult.payment
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
 * @returns {Object.<number, WmpAgreementLevelItem>} Agreement level items keyed by ID
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
      tiers: paymentResult.tierValues.map((tierValue, index) => ({
        number: index + 1,
        quantity: paymentResult.eligibleArea,
        rateInPence: tierValue.tier.ratePerUnitGbp,
        flatRateInPence: tierValue.tier.flatRateGbp,
        totalInPence: tierValue.value
      })),
      agreementTotalPence: paymentResult.payment,
      unit: 'ha',
      quantity: paymentResult.eligibleArea
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
    explanations: [], // TODO: add explanations
    agreementStartDate,
    agreementEndDate: getAgreementEndDate(
      agreementStartDate,
      action.durationYears
    ),
    frequency: 'Single',
    agreementTotalPence: wmpCalculationResult.payment,
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
