import { getEnabledActions } from '../api/actions/queries/getActions.query.js'
import {
  calculateScheduledPayments,
  calculateTotalPayments,
  createPaymentItems,
  roundLineItemsPayments,
  shiftTotalPenniesToFirstScheduledPayment
} from './amountCalculation.js'
import { generatePaymentSchedule } from './generateSchedule.js'

/**
 * Gets payment calculation data requirements
 * @param {object} postgresDb
 * @param {object} logger
 * @returns {Promise<Array<Action>>}
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

  const { agreementStartDate, agreementEndDate, schedule } =
    generatePaymentSchedule(new Date(), durationYears, frequency)

  const { parcelItems, agreementItems } = createPaymentItems(parcels, actions)

  const { annualTotalPence, agreementTotalPence } = calculateTotalPayments(
    parcelItems,
    agreementItems,
    durationYears
  )

  const payments = calculateScheduledPayments(
    parcelItems,
    agreementItems,
    schedule
  )

  const shiftedPayments = shiftTotalPenniesToFirstScheduledPayment(payments)
  const revisedPayments = roundLineItemsPayments(shiftedPayments)

  return {
    agreementStartDate,
    agreementEndDate,
    frequency,
    agreementTotalPence,
    annualTotalPence,
    parcelItems,
    agreementLevelItems: agreementItems,
    payments: revisedPayments
  }
}

/**
 * @import { PaymentParcel } from './payment-calculation.d.js'
 * @import { Action } from '../api/actions/action.d.js'
 */
