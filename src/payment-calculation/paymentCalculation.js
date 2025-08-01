import { getEnabledActions } from '../api/actions/queries/getActions.query.js'
import {
  calculateAnnualAndAgreementTotals,
  calculateScheduledPayments,
  createPaymentItems,
  roundAnnualPaymentAmountForItems,
  roundPaymentAmountForPaymentLineItems,
  shiftTotalPenniesToFirstScheduledPayment
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
 * @returns
 */
export const getPaymentCalculationForParcels = (
  parcels,
  actions,
  durationYears
) => {
  const frequency = 'Quarterly'

  if (!actions) return {}

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
    generatePaymentSchedule(new Date(), durationYears, frequency)

  // calculate payments based on schedule and parcel/agreement items amounts
  const payments = calculateScheduledPayments(
    parcelItems,
    agreementItems,
    schedule
  )

  // shift quarter payments pennies to first scheduled payment
  const shiftedPayments = shiftTotalPenniesToFirstScheduledPayment(payments)

  // now that we have shifted pennies, round items amounts if they have decimals
  const roundedItems = {
    parcelItems: roundAnnualPaymentAmountForItems(parcelItems),
    agreementLevelItems: roundAnnualPaymentAmountForItems(agreementItems),
    payments: roundPaymentAmountForPaymentLineItems(shiftedPayments)
  }

  return {
    agreementStartDate,
    agreementEndDate,
    frequency,
    agreementTotalPence,
    annualTotalPence,
    ...roundedItems
  }
}

/**
 * @import { PaymentParcel } from './payment-calculation.d.js'
 * @import { Action } from '../api/actions/action.d.js'
 */
