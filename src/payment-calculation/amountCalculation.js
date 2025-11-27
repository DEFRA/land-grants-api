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
const findActionByCode = (code, actions = []) => {
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
export const calculateAnnualAndAgreementTotals = (
  parcelItems,
  agreementItems,
  durationYears
) => {
  let annualTotalPence = 0
  for (const [, parcelItem] of Object.entries(parcelItems)) {
    annualTotalPence += parcelItem.annualPaymentPence ?? 0
  }
  for (const [, agreementItem] of Object.entries(agreementItems)) {
    annualTotalPence += agreementItem.annualPaymentPence ?? 0
  }

  return {
    annualTotalPence: Math.floor(annualTotalPence),
    agreementTotalPence: Math.floor(annualTotalPence * durationYears)
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
    shiftTotalPenniesToFirstScheduledPayment(
      payments,
      parcelItems,
      agreementItems
    )

  // Note: createParcelPaymentItem() rounds the values in annualPaymentPence
  // Note: so we can skip the rounding below as the values in annualPaymentPence are integer values

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
 * @param {Array<PaymentParcelItem>} parcelItems
 * @param {Array<PaymentAgreementItem>} agreementItems
 * @returns {{adjustedPayments: Array<ScheduledPayment>, explanations: Array<string>}}
 */
const shiftTotalPenniesToFirstScheduledPayment = (
  payments,
  parcelItems,
  agreementItems
) => {
  if (!payments.length) {
    return { adjustedPayments: [], explanations: [] }
  }

  const explanations = []
  const adjustedPayments = structuredClone(payments)
  let decimalsForAllPayments = 0

  // Note: this calculates the total number of pennies to shift to the first payment
  // Note: use the parcelItems annualPaymentPence, as this contains the correct annualPaymentPence
  for (const [, parcelItem] of Object.entries(parcelItems)) {
    const penniesToShift =
      (parcelItem.annualPaymentPence * parcelItem.durationYears) %
      payments.length
    explanations.push(
      `- Shifting ${penniesToShift} pennies to first payment for parcel ${parcelItem.code}: ${parcelItem.annualPaymentPence} * ${parcelItem.durationYears} mod ${payments.length} = ${penniesToShift} pence`
    )

    decimalsForAllPayments += penniesToShift
  }

  // Note: shift any pennies on the agreement items to the first payment
  for (const [, agreementItem] of Object.entries(agreementItems)) {
    const penniesToShift =
      (agreementItem.annualPaymentPence * agreementItem.durationYears) %
      payments.length
    explanations.push(
      `- Shifting ${penniesToShift} pennies to first payment for agreement ${agreementItem.code}: ${agreementItem.annualPaymentPence} * ${agreementItem.durationYears} mod ${payments.length} = ${penniesToShift} pence`
    )

    decimalsForAllPayments += penniesToShift
  }

  // add the total number of pennies to shift to the first payment
  adjustedPayments[0].totalPaymentPence = Math.round(
    adjustedPayments[0].totalPaymentPence + decimalsForAllPayments
  )

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
      // Note: floor this value and remove the fraction, this is the correct amount to be paid for this payment date
      totalPaymentPence += Math.floor(paymentPence)
    }

    for (const [id, agreementItem] of Object.entries(agreementLevelItems)) {
      const paymentPence = agreementItem.annualPaymentPence / paymentsPerYear
      lineItems.push({
        agreementLevelItemId: Number(id),
        paymentPence
      })
      // Note: floor this value and remove the fraction, this is the correct amount to be paid for this payment date
      totalPaymentPence += Math.floor(paymentPence)
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
  annualPaymentPence: Math.round(
    gbpToPence(actionData?.payment.ratePerUnitGbp) * action.quantity
  ),
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

      // Note: annualPaymentPence is rounded here so no fractions are carried forward, after this point.
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
