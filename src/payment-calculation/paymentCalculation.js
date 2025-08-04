import { getEnabledActions } from '../api/actions/queries/getActions.query.js'
import {
  calculateAnnualAndAgreementTotals,
  calculateScheduledPayments,
  createPaymentItems,
  reconcilePaymentAmounts
} from './amountCalculation.js'
import { generatePaymentSchedule } from './generateSchedule.js'

/**
 * Gets payment calculation data requirements
 * @param {object} postgresDb
 * @param {object} logger
 * @returns {Promise<{enabledActions: Array<Action>}>}
 */
export const getPaymentCalculationDataRequirements = async (
  postgresDb,
  logger
) => {
  const enabledActions = await getEnabledActions(logger, postgresDb)
  return { enabledActions }
}

/**
 * Returns the payment calculation for an array of parcels
 * @param {Array<PaymentParcel>} parcels
 * @param {Array<Action>} actions
 * @param {number} durationYears
 * @param {string} startDate
 * @returns {PaymentCalculationResponse}
 */
export const getPaymentCalculationForParcels = (
  parcels,
  actions,
  durationYears,
  startDate
) => {
  const frequency = 'Quarterly'

  // generate parcel and agreement level items
  const { parcelItems, agreementItems } = createPaymentItems(parcels, actions)

  // calculate total amounts
  const { annualTotalPence, agreementTotalPence } =
    calculateAnnualAndAgreementTotals(
      parcelItems,
      agreementItems,
      durationYears
    )

  // generate date schedule
  const { agreementStartDate, agreementEndDate, schedule } =
    generatePaymentSchedule(startDate ?? new Date(), durationYears, frequency)

  // calculate payments based on schedule and parcel/agreement items amounts
  const payments = calculateScheduledPayments(
    parcelItems,
    agreementItems,
    schedule
  )

  // reconcile payment amounts (shift pennies and round final amounts after calculations)
  const {
    parcelItems: revisedParcelItems,
    agreementLevelItems: revisedAgreementItems,
    payments: revisedPayments
  } = reconcilePaymentAmounts(parcelItems, agreementItems, payments)

  return {
    agreementStartDate,
    agreementEndDate,
    frequency,
    agreementTotalPence,
    annualTotalPence,
    parcelItems: revisedParcelItems,
    agreementLevelItems: revisedAgreementItems,
    payments: revisedPayments
  }
}

/**
 * @import { PaymentParcel, PaymentCalculationResponse } from './payment-calculation.d.js'
 * @import { Action } from '../api/actions/action.d.js'
 */
