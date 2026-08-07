import { differenceInCalendarMonths } from 'date-fns'
import { createExplanationSection } from '~/src/features/available-area/explanations.js'
import { gbpToPence } from '~/src/features/common/helpers/currency.js'

/**
 * currency formatter
 * @returns {object & {format: (arg0: number) => string}}
 */

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP'
})

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
 *
 * The agreement total is calculated using the duration of each individual item,
 * so actions with different durations contribute their own total to the agreement.
 * @param {object} parcelItems
 * @param {object} agreementItems
 * @returns {{annualTotalPence: number, agreementTotalPence: number}}
 */
export const calculateAnnualAndAgreementTotals = (
  parcelItems,
  agreementItems
) => {
  let annualTotalPence = 0
  let agreementTotalPence = 0
  for (const [, parcelItem] of Object.entries(parcelItems)) {
    const annualPaymentPence = parcelItem.annualPaymentPence ?? 0
    annualTotalPence += annualPaymentPence
    agreementTotalPence += annualPaymentPence * (parcelItem.durationYears ?? 0)
  }
  for (const [, agreementItem] of Object.entries(agreementItems)) {
    const annualPaymentPence = agreementItem.annualPaymentPence ?? 0
    annualTotalPence += annualPaymentPence
    agreementTotalPence +=
      annualPaymentPence * (agreementItem.durationYears ?? 0)
  }

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
    shiftTotalPenniesToFirstScheduledPayment(
      payments,
      parcelItems,
      agreementItems
    )

  return {
    parcelItems,
    agreementLevelItems: agreementItems,
    payments: roundPaymentAmountForPaymentLineItems(adjustedPayments),
    explanations: createExplanationSection('Payment calculation', explanations)
  }
}

/**
 * Calculates the number of pennies to shift to the first payment for an item so
 * that the sum of its line items exactly matches its agreement total
 * (annualPaymentPence * durationYears) over the payments it appears in.
 * @param {PaymentParcelItem | PaymentAgreementItem} item
 * @param {Array<ScheduledPayment>} payments
 * @param {(lineItem: LineItem) => boolean} findLineItem
 * @returns {{penniesToShift: number, flooredTotal: number}}
 */
const calculatePenniesToShift = (item, payments, findLineItem) => {
  let flooredTotal = 0
  for (const payment of payments) {
    const lineItem = payment.lineItems.find(findLineItem)
    if (lineItem) {
      flooredTotal += Math.floor(lineItem.paymentPence)
    }
  }

  const itemTotal = (item.annualPaymentPence ?? 0) * (item.durationYears ?? 0)

  return {
    penniesToShift: itemTotal - flooredTotal,
    flooredTotal
  }
}

/**
 * Formats the distinct payment amounts of a list of payments with their
 * occurrence counts, e.g. "359827 pence (x3), 220480 pence (x8)". When all
 * payments are the same this degrades to a single entry, e.g. "9532 pence (x11)".
 * @param {Array<ScheduledPayment>} payments
 * @returns {string}
 */
export const formatDistinctPaymentBreakdown = (payments) => {
  const breakdown = new Map()
  for (const payment of payments) {
    breakdown.set(
      payment.totalPaymentPence,
      (breakdown.get(payment.totalPaymentPence) ?? 0) + 1
    )
  }

  return Array.from(breakdown.entries())
    .map(([amount, count]) => `${amount} pence (x${count})`)
    .join(', ')
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
  const firstAdjustedPayment = adjustedPayments[0]
  let decimalsForAllPayments = 0

  // Note: this calculates the total number of pennies to shift to the first payment
  // Note: use the parcelItems annualPaymentPence, as this contains the correct annualPaymentPence
  for (const [parcelItemId, parcelItem] of Object.entries(parcelItems)) {
    const { penniesToShift, flooredTotal } = calculatePenniesToShift(
      parcelItem,
      adjustedPayments,
      (lineItem) => lineItem.parcelItemId === Number(parcelItemId)
    )
    explanations.push(
      `- Shifting ${penniesToShift} pennies to first payment for parcel ${parcelItem.code}: (${parcelItem.annualPaymentPence} * ${parcelItem.durationYears}) - ${flooredTotal} = ${penniesToShift} pence`
    )

    // add pennies for each individual line item of the first payment
    const lineItemIndex = firstAdjustedPayment.lineItems.findIndex(
      (item) => item.parcelItemId === Number(parcelItemId)
    )
    if (lineItemIndex > -1) {
      firstAdjustedPayment.lineItems[lineItemIndex].paymentPence +=
        penniesToShift
    }
    decimalsForAllPayments += penniesToShift
  }

  // Note: shift any pennies on the agreement items to the first payment
  for (const [agreementItemId, agreementItem] of Object.entries(
    agreementItems
  )) {
    const { penniesToShift, flooredTotal } = calculatePenniesToShift(
      agreementItem,
      adjustedPayments,
      (lineItem) => lineItem.agreementLevelItemId === Number(agreementItemId)
    )
    explanations.push(
      `- Shifting ${penniesToShift} pennies to first payment for agreement ${agreementItem.code}: (${agreementItem.annualPaymentPence} * ${agreementItem.durationYears}) - ${flooredTotal} = ${penniesToShift} pence`
    )

    // add pennies for each individual line item of the first payment
    const agreementItemIndex = firstAdjustedPayment.lineItems.findIndex(
      (item) => item.agreementLevelItemId === Number(agreementItemId)
    )
    if (agreementItemIndex > -1) {
      firstAdjustedPayment.lineItems[agreementItemIndex].paymentPence +=
        penniesToShift
    }
    decimalsForAllPayments += penniesToShift
  }

  // add the total number of pennies to shift to the first payment
  firstAdjustedPayment.totalPaymentPence = Math.round(
    firstAdjustedPayment.totalPaymentPence + decimalsForAllPayments
  )

  explanations.push(
    `- TOTAL: ${firstAdjustedPayment.totalPaymentPence} pence/year`,
    `- FIRST PAYMENT (QUARTER) : ${adjustedPayments[1]?.totalPaymentPence} + ${decimalsForAllPayments} = ${firstAdjustedPayment.totalPaymentPence} pence`,
    `- QUARTERLY PAYMENTS (REST): ${formatDistinctPaymentBreakdown(
      adjustedPayments.slice(1)
    )}`
  )

  return { adjustedPayments, explanations }
}

/**
 * Round pence amounts for payment lineItems
 * @param {Array<ScheduledPayment>} payments
 * @returns {Array<ScheduledPayment>}
 */
const roundPaymentAmountForPaymentLineItems = (payments) =>
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
 * Determines whether an item is paid on a given payment. An item is paid
 * quarterly for the full length of its own duration, starting from the first
 * scheduled payment, so shorter duration actions stop being paid before longer
 * duration actions.
 * @param {number | undefined} durationYears
 * @param {number} paymentsPerYear
 * @param {number} paymentIndex
 * @returns {boolean}
 */
const isItemActiveAtPayment = (
  durationYears,
  paymentsPerYear,
  paymentIndex
) => {
  if (durationYears == null) {
    return true
  }
  return paymentIndex < durationYears * paymentsPerYear
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

  return schedule.map((paymentDate, paymentIndex) => {
    const lineItems = []
    let totalPaymentPence = 0

    for (const [id, parcelItem] of Object.entries(parcelItems)) {
      if (
        !isItemActiveAtPayment(
          parcelItem.durationYears,
          paymentsPerYear,
          paymentIndex
        )
      ) {
        continue
      }
      const paymentPence = parcelItem.annualPaymentPence / paymentsPerYear
      lineItems.push({
        parcelItemId: Number(id),
        paymentPence
      })
      // Note: floor this value and remove the fraction, this is the correct amount to be paid for this payment date
      totalPaymentPence += Math.floor(paymentPence)
    }

    for (const [id, agreementItem] of Object.entries(agreementLevelItems)) {
      if (
        !isItemActiveAtPayment(
          agreementItem.durationYears,
          paymentsPerYear,
          paymentIndex
        )
      ) {
        continue
      }
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
  semanticVersion: actionData?.semanticVersion,
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
  semanticVersion: actionData?.semanticVersion,
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
        `- Rate per ${actionData?.applicationUnitOfMeasurement} per year:  ${currencyFormatter.format(actionData?.payment?.ratePerUnitGbp)}`
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
          `- Payment: (${action.quantity} * ${actionData?.payment.ratePerUnitGbp}) = ${currencyFormatter.format(total)} per year`
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
const addAgreementItem = (
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
  ).some((item) => item.code === action.code)

  if (hasAgreementItemBeenAdded) {
    explanations.push(
      `- Ignoring rate per agreement/year, already applied.`,
      `- Payment: (${action.quantity} * ${actionData?.payment.ratePerUnitGbp}) = ${currencyFormatter.format(total)} per year`
    )
  } else {
    paymentItems.agreementItems[agreementItemKey] =
      createAgreementPaymentItem(actionData)
    agreementItemKey++

    const paymentTotal = total + (ratePerAgreementPerYearGbp ?? 0)

    explanations.push(
      `- Rate per agreement per year: ${currencyFormatter.format(actionData?.payment.ratePerAgreementPerYearGbp)}`,
      `- Payment: (${action.quantity} * ${actionData?.payment.ratePerUnitGbp}) + ${actionData?.payment.ratePerAgreementPerYearGbp} = ${currencyFormatter.format(paymentTotal)} per year`
    )
  }
  return agreementItemKey
}

/**
 * @import { PaymentParcel, ScheduledPayment, PaymentParcelAction, PaymentParcelItem, PaymentAgreementItem, LineItem } from './payment-calculation.d.js'
 * @import { Action } from '../actions/action.d.js'
 * @import { ExplanationSection } from '~/src/features/available-area/explanations.d.js'
 */
