import { getEnabledActions } from '../api/actions/queries/getActions.query.js'
import {
  calculateScheduledPayments,
  calculateTotalPayments,
  createPaymentItems
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
  const actions = await getEnabledActions(logger, postgresDb)
  return actions
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

  const { annualTotalPence, agreementTotalPence } = calculateTotalPayments(
    parcels,
    actions,
    durationYears
  )
  const { agreementStartDate, agreementEndDate, schedule } =
    generatePaymentSchedule(new Date(), durationYears)

  const { parcelItems, agreementItems } = createPaymentItems(parcels, actions)

  const payments = calculateScheduledPayments(
    parcelItems,
    agreementItems,
    schedule
  )

  return {
    agreementStartDate,
    agreementEndDate,
    frequency,
    agreementTotalPence,
    annualTotalPence,
    parcelItems,
    payments,
    agreementLevelItems: agreementItems
  }
}

/**
 * @import { PaymentParcel } from './payment-calculation.d.js'
 * @import { Action } from '../api/actions/action.d.js'
 */
