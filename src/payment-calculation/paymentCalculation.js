import { getEnabledActions } from '../api/actions/queries/getActions.query.js'
import {
  calculateTotalPayments,
  createPaymentItems
} from './amountCalculation.js'
import { generatePaymentSchedule } from './generateSchedule.js'

export const getPaymentCalculationDataRequirements = async (
  postgresDb,
  logger
) => {
  const actions = await getEnabledActions(logger, postgresDb)
  return actions
}

export const getPaymentCalculationForParcels = (parcels, actions) => {
  const frequency = 'Quarterly'
  const agreementLengthYears = 3

  if (!actions) return {}

  const { annualTotalPence, agreementTotalPence } = calculateTotalPayments(
    parcels,
    actions
  )
  const { agreementStartDate, agreementEndDate } = generatePaymentSchedule(
    new Date(),
    agreementLengthYears
  )

  const { parcelItems, agreementItems } = createPaymentItems(parcels, actions)

  return {
    agreementStartDate,
    agreementEndDate,
    frequency,
    agreementTotalPence,
    annualTotalPence,
    parcelItems,
    agreementLevelItems: agreementItems
  }
}
