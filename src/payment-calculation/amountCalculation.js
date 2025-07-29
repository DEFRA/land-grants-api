import { differenceInMonths } from 'date-fns'

/**
 * Gbp to pence
 * @param {number} gbp
 * @returns {number}
 */
const gbpToPence = (gbp = 0) => gbp * 100

/**
 * Find an action by code
 * @param {Array<Action>} actions
 * @returns {Action | undefined}
 */
const findActionByCode = (actions = [], code) => {
  const action = actions.find((a) => a.code === code)
  return action
}

/**
 * Calculates annual and total payments in pence for a given action
 * @param {PaymentParcelAction} action
 * @returns {{annualTotalPence: number, totalPence: number}}
 */
const calculateTotalPaymentForAction = (action, actionData = {}) => {
  const { durationYears = 0, payment = {} } = actionData
  const { ratePerUnitGbp = 0, ratePerAgreementPerYearGbp = 0 } = payment

  const unitPaymentPence = gbpToPence(ratePerUnitGbp) * action.quantity
  const agreementPaymentPence = gbpToPence(ratePerAgreementPerYearGbp)
  const annualTotalPence = unitPaymentPence + agreementPaymentPence

  return {
    annualTotalPence,
    totalPence: durationYears * annualTotalPence
  }
}

/**
 * Calculates annual and total payments in pence for a given parcel
 * @param {Array<PaymentParcelAction>} parcelActions
 * @returns {{parcelAnnualTotalPence: number, parcelTotalPence: number}}
 */
const calculateTotalPaymentForParcel = (parcelActions, actions) => {
  let parcelTotalPence = 0
  let parcelAnnualTotalPence = 0

  for (const action of parcelActions) {
    const actionData = findActionByCode(actions, action.code)
    const { annualTotalPence, totalPence } = calculateTotalPaymentForAction(
      action,
      actionData
    )

    parcelTotalPence += totalPence
    parcelAnnualTotalPence += annualTotalPence
  }

  return {
    parcelAnnualTotalPence,
    parcelTotalPence
  }
}

/**
 * Calculates annual and total payments in pence for all parcels of an application
 * @param {Array<PaymentParcel>} parcels
 * @param {Array<Action>} actions
 * @param {number} durationYears
 * @returns {{annualTotalPence: number, agreementTotalPence: number}}
 */
export const calculateTotalPayments = (parcels, actions, durationYears) => {
  let annualTotalPence = 0

  for (const parcel of parcels) {
    const { parcelAnnualTotalPence } = calculateTotalPaymentForParcel(
      parcel.actions,
      actions
    )
    annualTotalPence += parcelAnnualTotalPence
  }

  return {
    annualTotalPence,
    agreementTotalPence: annualTotalPence * durationYears
  }
}

/**
 * Calculate payments per year based on month intervals
 * @param {Array<string>} schedule
 * @returns {number}
 */
const calculatePaymentsPerYear = (schedule) => {
  if (schedule.length < 2) return schedule.length
  const monthDiff = differenceInMonths(schedule[1], schedule[0])
  return 12 / monthDiff
}

/**
 * Calculates scheduled payments information for all parcels items and agreement level items
 * @param {Array<PaymentParcelItem>} parcelItems
 * @param {Array<PaymentAgreementItem>} agreementLevelItems
 * @param {Array<string>} schedule
 * @returns {Array<ScheduledPayment>}
 */
export const calculateScheduledPayments = (
  parcelItems,
  agreementLevelItems,
  schedule
) => {
  const paymentsPerYear = calculatePaymentsPerYear(schedule)
  const scheduledPayments = schedule.map((paymentDate) => {
    const lineItems = []
    let totalPaymentPence = 0

    Object.entries(parcelItems).forEach(([id, parcelItem]) => {
      const paymentPence = parcelItem.annualPaymentPence / paymentsPerYear
      lineItems.push({
        parcelItemId: Number(id),
        paymentPence
      })
      totalPaymentPence += paymentPence
    })

    Object.entries(agreementLevelItems).forEach(([id, agreementItem]) => {
      const paymentPence = agreementItem.annualPaymentPence / paymentsPerYear
      lineItems.push({
        agreementLevelItemId: Number(id),
        paymentPence
      })
      totalPaymentPence += paymentPence
    })

    return {
      totalPaymentPence,
      paymentDate,
      lineItems
    }
  })

  return scheduledPayments
}

/**
 * Creates a parcel payment item to be included on the response payload
 * @param {PaymentParcelAction} action
 * @param {Action | undefined} actionData
 * @param {PaymentParcel} parcel
 * @returns {PaymentParcelItem}
 */
const createParcelPaymentItem = (action, actionData, parcel) => ({
  code: actionData?.code ?? '',
  description: actionData?.description ?? '',
  unit: actionData?.applicationUnitOfMeasurement ?? '',
  quantity: action.quantity,
  rateInPence: gbpToPence(actionData?.payment.ratePerUnitGbp),
  annualPaymentPence:
    gbpToPence(actionData?.payment.ratePerUnitGbp) * action.quantity,
  sheetId: parcel.sheetId,
  parcelId: parcel.parcelId
})

/**
 * Creates an agreement level  payment item to be included on the response payload
 * @param {Action} actionData
 * @returns {PaymentAgreementItem}
 */
const createAgreementPaymentItem = (actionData) => ({
  code: actionData?.code,
  description: actionData?.description,
  annualPaymentPence: gbpToPence(actionData?.payment.ratePerAgreementPerYearGbp)
})

/**
 * Creates parcel and agreement items to be included on the response payload
 * @param {Array<PaymentParcel>} parcels
 * @param {Array<Action>} actions
 * @returns {{parcelItems: object, agreementItems: object}}
 */
export const createPaymentItems = (parcels, actions) => {
  const paymentItems = {
    parcelItems: {},
    agreementItems: {}
  }

  parcels.forEach((parcel, index) => {
    const parcelKey = index + 1

    for (const action of parcel.actions) {
      const actionData = findActionByCode(actions, action.code)

      paymentItems.parcelItems[parcelKey] = createParcelPaymentItem(
        action,
        actionData,
        parcel
      )

      if (actionData?.payment.ratePerAgreementPerYearGbp) {
        const hasAgreementItemBeenAdded = Object.values(
          paymentItems.agreementItems
        ).find((item) => item.code === action.code)

        if (!hasAgreementItemBeenAdded)
          paymentItems.agreementItems[parcelKey] =
            createAgreementPaymentItem(actionData)
      }
    }
  })

  return paymentItems
}

/**
 * @import { PaymentParcel, ScheduledPayment, PaymentParcelAction, PaymentParcelItem, PaymentAgreementItem } from './payment-calculation.d.js'
 * @import { Action } from '../api/actions/action.d.js'
 */
