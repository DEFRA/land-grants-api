import { differenceInCalendarMonths } from 'date-fns'

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
 * Calculates annual and total payments in pence for all parcels of an application
 * @param {Array<PaymentParcelItem>} parcelItems
 * @param {Array<PaymentAgreementItem>} agreementItems
 * @param {number} durationYears
 * @returns {{annualTotalPence: number, agreementTotalPence: number}}
 */
export const calculateTotalPayments = (
  parcelItems,
  agreementItems,
  durationYears
) => {
  let annualTotalPence = 0
  Object.entries(parcelItems).forEach(([, parcelItem]) => {
    annualTotalPence += parcelItem.annualPaymentPence ?? 0
  })
  Object.entries(agreementItems).forEach(([, agreementItem]) => {
    annualTotalPence += agreementItem.annualPaymentPence ?? 0
  })

  return {
    annualTotalPence: Math.floor(annualTotalPence),
    agreementTotalPence: Math.floor(annualTotalPence * durationYears)
  }
}

export const shiftPenniesToFirstScheduledPayment = (payments) => {
  const adjustedPayments = payments.map((payment) => ({
    ...payment,
    lineItems: payment.lineItems.map((item) => ({ ...item }))
  }))

  for (let i = 0; i < adjustedPayments[0].lineItems.length; i++) {
    const hasDecimals = adjustedPayments.some(
      (payment) => payment.lineItems[i].paymentPence % 1 > 0
    )

    if (hasDecimals) {
      let totalDecimals = 0
      adjustedPayments.forEach((payment) => {
        const decimals = payment.lineItems[i].paymentPence % 1
        totalDecimals += decimals
        payment.lineItems[i].paymentPence = Math.floor(
          payment.lineItems[i].paymentPence
        )
      })

      adjustedPayments[0].lineItems[i].paymentPence += totalDecimals
      adjustedPayments[0].lineItems[i].paymentPence = Math.floor(
        adjustedPayments[0].lineItems[i].paymentPence
      )
    }
  }

  // recalculate totalPaymentPence based on rounding
  adjustedPayments.forEach((payment, index) => {
    adjustedPayments[index].totalPaymentPence = adjustedPayments[
      index
    ].lineItems.reduce((acc, item) => acc + item.paymentPence, 0)
  })

  return adjustedPayments
}

/**
 * Calculate payments per year based on month intervals
 * @param {Array<string>} schedule
 * @returns {number}
 */
const calculatePaymentsPerYear = (schedule) => {
  if (schedule.length < 2) return schedule.length
  const monthDiff = differenceInCalendarMonths(schedule[1], schedule[0])
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

  let parcelItemKey = 1
  let agreementItemKey = 1

  parcels.forEach((parcel) => {
    for (const action of parcel.actions) {
      const actionData = findActionByCode(actions, action.code)

      paymentItems.parcelItems[parcelItemKey] = createParcelPaymentItem(
        action,
        actionData,
        parcel
      )

      if (actionData?.payment.ratePerAgreementPerYearGbp) {
        const hasAgreementItemBeenAdded = Object.values(
          paymentItems.agreementItems
        ).find((item) => item.code === action.code)

        if (!hasAgreementItemBeenAdded)
          paymentItems.agreementItems[agreementItemKey] =
            createAgreementPaymentItem(actionData)

        agreementItemKey++
      }

      parcelItemKey++
    }
  })

  return paymentItems
}

/**
 * @import { PaymentParcel, ScheduledPayment, PaymentParcelAction, PaymentParcelItem, PaymentAgreementItem } from './payment-calculation.d.js'
 * @import { Action } from '../api/actions/action.d.js'
 */
