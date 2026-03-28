import { addMonths, addYears, format, parseISO, startOfMonth } from 'date-fns'

const DATE_FORMAT = 'yyyy-MM-dd'

/**
 * Returns the agreement start date. When `startDate` is provided it is used as
 * an override; otherwise defaults to the 1st of next month.
 * @param {string | undefined} startDate - Optional start date override in YYYY-MM-DD format
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

export const transformPayments = (paymentResult, agreementStartDate) => {
  return [
    {
      totalPaymentPence: paymentResult.payment, // paymentResult.payment
      paymentDate: agreementStartDate, // agreementStartDate
      lineItems: [
        {
          agreementLevelItemId: 1,
          paymentPence: paymentResult.payment // paymentResult.payment
        }
      ]
    }
  ]
}

export const transformAgreementLevelItems = (totalParcelArea) => {
  return {
    1: {
      code: 'PA3', // action.code
      description: 'Woodland Management Plan', // action.description
      version: '3.1.0', // action.semanticVersion
      parcelIds: ['SD6346-3387'], // parcelIds
      tiers: [
        {
          number: 1,
          quantity: 50,
          rateInPence: 0, // tier.rateInPence
          flatRateInPence: 150000, // tier.flatRateInPence
          totalInPence: 150000 // tier.totalInPence
        },
        {
          number: 2,
          quantity: 50,
          rateInPence: 3000, // tier.rateInPence
          flatRateInPence: 0, // tier.flatRateInPence
          totalInPence: 150000 // tier.totalInPence
        },
        {
          number: 3,
          quantity: 50,
          rateInPence: 1500, // tier.rateInPence
          flatRateInPence: 0, // tier.flatRateInPence
          totalInPence: 75000 // tier.totalInPence
        }
      ],
      agreementTotalPence: 375000, // paymentResult.payment
      unit: 'ha',
      quantity: totalParcelArea // totalParcelArea
    }
  }
}

/**
 * Transforms a WMP payment calculation result into the API response shape.
 * @param {object} paymentResult - The payment result object
 * @param {number} totalParcelArea - The total parcel area
 * @param {import('../../actions/action.d.js').Action} action - The action object
 * @param {string | undefined} startDate - Optional start date override in YYYY-MM-DD format
 * @returns {object} The transformed payment response
 */
export const wmpPaymentCalculateTransformer = (
  paymentResult,
  totalParcelArea,
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
    agreementTotalPence: paymentResult.payment,
    parcelItems: {},
    agreementLevelItems: transformAgreementLevelItems(totalParcelArea),
    payments: transformPayments(paymentResult, agreementStartDate)
  }
}
