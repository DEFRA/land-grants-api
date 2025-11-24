import { differenceInCalendarMonths } from 'date-fns'
import { createExplanationSection } from '../available-area/explanations.js'

/**
 * Gbp to pence
 * @param {number} gbp
 * @returns {number}
 */
const gbpToPence = (gbp = 0) => gbp * 100

/**
 * Find an action by code
 * @param {string} code
 * @param {Array<Action>} actions
 * @returns {Action | undefined}
 */
export const findActionByCode = (code, actions = []) => {
  const action = actions.find((a) => a.code === code)
  return action
}

/**
 * Calculates annual and total payments in pence for all parcels of an application
 * @param {Array<ScheduledPayment>} payments
 * @param {number} durationYears
 * @returns {{annualTotalPence: number, agreementTotalPence: number}}
 */
export const calculateAnnualAndAgreementTotals = (payments, durationYears) => {
  if (!payments.length) {
    return { annualTotalPence: 0, agreementTotalPence: 0 }
  }

  const agreementTotalPence = payments.reduce(
    (acc, payment) => acc + payment.totalPaymentPence,
    0
  )
  const annualTotalPence =
    payments.reduce((acc, payment) => acc + payment.totalPaymentPence, 0) /
    durationYears

  return {
    annualTotalPence: Math.floor(annualTotalPence),
    agreementTotalPence: Math.floor(agreementTotalPence)
  }
}

/**
 * Reconciles payment amounts (shifting pennies and rounding final amounts)
 * @param {Array<PaymentParcelItem>} parcelItems
 * @param {Array<PaymentAgreementItem>} agreementItems
 * @param {Array<ScheduledPayment>} payments
 * @returns {{parcelItems: Array<PaymentParcelItem>, agreementLevelItems: Array<PaymentAgreementItem>, payments: Array<ScheduledPayment>, explanations: ExplanationSection}}
 */
export const reconcilePaymentAmounts = (
  parcelItems,
  agreementItems,
  payments
) => {
  const { adjustedPayments, explanations } =
    shiftTotalPenniesToFirstScheduledPayment(payments)

  return {
    parcelItems: roundAnnualPaymentAmountForItems(parcelItems),
    agreementLevelItems: roundAnnualPaymentAmountForItems(agreementItems),
    payments: roundPaymentAmountForPaymentLineItems(adjustedPayments),
    explanations: createExplanationSection('Payment calculation', explanations)
  }
}

/**
 * Shifts payment pennies from all payments to the first scheduled payment
 * @param {Array<ScheduledPayment>} payments
 * @returns {{adjustedPayments: Array<ScheduledPayment>, explanations: Array<string>}}
 */
const shiftTotalPenniesToFirstScheduledPayment = (payments) => {
  if (!payments.length) {
    return { adjustedPayments: [], explanations: [] }
  }

  const explanations = []

  let adjustedPayments = structuredClone(payments)
  const firstPayment = adjustedPayments[0]
  const hasDecimals = firstPayment.totalPaymentPence % 1
  let decimalsForAllPayments = 0

  if (hasDecimals) {
    decimalsForAllPayments = adjustedPayments.reduce((acc, payment) => {
      const decimals = payment.totalPaymentPence % 1
      return acc + decimals
    }, 0)

    adjustedPayments = adjustedPayments.map((adjustedPayment) => ({
      ...adjustedPayment,
      totalPaymentPence: Math.floor(adjustedPayment.totalPaymentPence)
    }))

    adjustedPayments[0].totalPaymentPence += decimalsForAllPayments
    adjustedPayments[0].totalPaymentPence = Math.floor(
      adjustedPayments[0].totalPaymentPence
    )

    explanations.push(
      `- Shifting pennies to first payment: ${hasDecimals} x 4 quarters x 3 years => ${decimalsForAllPayments} pence`
    )
  }

  explanations.push(
    `- TOTAL: ${adjustedPayments[0].totalPaymentPence} pence/year`,
    `- FIRST PAYMENT (QUARTER) : ${adjustedPayments[1].totalPaymentPence} + ${decimalsForAllPayments} = ${adjustedPayments[0].totalPaymentPence}} pence`,
    `- REST OF PAYMENTS (QUARTER): ${adjustedPayments[1].totalPaymentPence} pence`
  )

  return { adjustedPayments, explanations }
}

/**
 * Round annual payment pence amount for parcelItems / agreementLevelItems
 * @param {Array<PaymentAgreementItem | PaymentParcelItem>} items
 * @returns {object}
 */
const roundAnnualPaymentAmountForItems = (items) =>
  Object.fromEntries(
    Object.entries(items).map(([id, item]) => [
      id,
      { ...item, annualPaymentPence: Math.floor(item.annualPaymentPence) }
    ])
  )

/**
 * Round pence amounts for payment lineItems
 * @param {Array<ScheduledPayment>} payments
 * @returns {Array<ScheduledPayment>}
 */
export const roundPaymentAmountForPaymentLineItems = (payments) =>
  structuredClone(payments).map((payment) => ({
    ...payment,
    lineItems: payment.lineItems.map((lineItem) => ({
      ...lineItem,
      paymentPence: Math.floor(lineItem.paymentPence)
    }))
  }))

const monthsInYear = 12
/**
 * Calculate payments per year based on month intervals
 * @param {Array<string>} schedule
 * @returns {number}
 */
const calculatePaymentsPerYear = (schedule) => {
  if (schedule.length < 2) {
    return schedule.length
  }
  const monthDiff = differenceInCalendarMonths(schedule[1], schedule[0])
  return monthsInYear / monthDiff
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
  return schedule.map((paymentDate) => {
    const lineItems = []
    let totalPaymentPence = 0

    for (const [id, parcelItem] of Object.entries(parcelItems)) {
      const paymentPence = parcelItem.annualPaymentPence / paymentsPerYear
      lineItems.push({
        parcelItemId: Number(id),
        paymentPence
      })
      totalPaymentPence += Math.floor(paymentPence)
    }

    for (const [id, agreementItem] of Object.entries(agreementLevelItems)) {
      const paymentPence = agreementItem.annualPaymentPence / paymentsPerYear
      lineItems.push({
        agreementLevelItemId: Number(id),
        paymentPence
      })
      totalPaymentPence += paymentPence
    }

    return {
      totalPaymentPence,
      paymentDate,
      lineItems
    }
  })
}

/**
 * Creates a parcel payment item to be included on the response payload
 * @param {PaymentParcelAction} action
 * @param {Action} actionData
 * @param {PaymentParcel} parcel
 * @returns {PaymentParcelItem}
 */
const createParcelPaymentItem = (action, actionData, parcel) => ({
  code: actionData?.code ?? '',
  description: actionData?.description ?? '',
  durationYears: actionData?.durationYears,
  version: Number(actionData?.version),
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
  durationYears: actionData?.durationYears,
  version: Number(actionData?.version),
  annualPaymentPence: gbpToPence(actionData?.payment.ratePerAgreementPerYearGbp)
})

/**
 * Creates parcel and agreement items to be included on the response payload
 * @param {Array<PaymentParcel>} parcels
 * @param {Array<Action>} actions
 * @returns {{parcelItems: object, agreementItems: object, explanations: ExplanationSection[]}}
 */
export const createPaymentItems = (parcels, actions) => {
  const paymentItems = {
    parcelItems: {},
    agreementItems: {},
    explanations: [
      {
        title: 'Payment items',
        content: ['Starting payment items']
      }
    ]
  }

  let parcelItemKey = 1
  let agreementItemKey = 1

  for (const parcel of parcels) {
    let explanations = []

    for (const action of parcel.actions) {
      const actionData = findActionByCode(action.code, actions)
      if (!actionData) {
        continue
      }

      explanations = explanations.concat([
        `Calculating payment for ${action?.code}`,
        `- Quantity applied for: ${action?.quantity} ${actionData?.applicationUnitOfMeasurement}`,
        `- Rate per ${actionData?.applicationUnitOfMeasurement} per year: ${actionData?.payment?.ratePerUnitGbp} pence`
      ])

      paymentItems.parcelItems[parcelItemKey] = createParcelPaymentItem(
        action,
        actionData,
        parcel
      )

      const total = action.quantity * (actionData?.payment?.ratePerUnitGbp ?? 0)
      const ratePerAgreementPerYearGbp =
        actionData?.payment.ratePerAgreementPerYearGbp

      if (actionData?.payment.ratePerAgreementPerYearGbp) {
        agreementItemKey = addAgreementItem(
          paymentItems,
          action,
          explanations,
          actionData,
          total,
          agreementItemKey,
          ratePerAgreementPerYearGbp
        )
      } else {
        explanations.push(
          `- Payment: (${action.quantity} * ${actionData?.payment.ratePerUnitGbp}) = ${total} pence/year`
        )
      }

      parcelItemKey++
    }

    paymentItems.explanations.push(
      createExplanationSection(
        `Parcel ${parcel.sheetId}-${parcel.parcelId}`,
        explanations
      )
    )
  }

  return paymentItems
}

/**
 * Adds an agreement item to the payment items
 * @param {object} paymentItems
 * @param {PaymentParcelAction} action
 * @param {Array<string>} explanations
 * @param {Action} actionData
 * @param {number} total
 * @param {number} agreementItemKey
 * @param {number} ratePerAgreementPerYearGbp
 * @returns {number}
 */
export const addAgreementItem = (
  paymentItems,
  action,
  explanations,
  actionData,
  total,
  agreementItemKey,
  ratePerAgreementPerYearGbp
) => {
  const hasAgreementItemBeenAdded = Object.values(
    paymentItems.agreementItems
  ).find((item) => item.code === action.code)

  if (hasAgreementItemBeenAdded) {
    explanations.push(
      `- Ignoring rate per agreement/year, already applied.`,
      `- Payment: (${action.quantity} * ${actionData?.payment.ratePerUnitGbp}) = ${total} pence/year`
    )
  } else {
    paymentItems.agreementItems[agreementItemKey] =
      createAgreementPaymentItem(actionData)
    agreementItemKey++

    explanations.push(
      `- Rate per agreement per year: ${actionData?.payment.ratePerAgreementPerYearGbp} pence`,
      `- Payment: (${action.quantity} * ${actionData?.payment.ratePerUnitGbp}) +
            ${actionData?.payment.ratePerAgreementPerYearGbp} = ${total + (ratePerAgreementPerYearGbp ?? 0)} pence/year`
    )
  }
  return agreementItemKey
}

/**
 * @import { PaymentParcel, ScheduledPayment, PaymentParcelAction, PaymentParcelItem, PaymentAgreementItem } from './payment-calculation.d.js'
 * @import { Action } from '../api/actions/action.d.js'
 * @import { ExplanationSection } from '../available-area/explanations.d.js'
 */
