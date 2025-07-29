const gbpToPence = (gbp = 0) => gbp * 100

const findActionByCode = (actions = [], code) => {
  const action = actions.find((a) => a.code === code)
  return action
}

const calculatePaymentForAction = (action, actionData) => {
  const { durationYears, payment } = actionData
  const { ratePerUnitGbp = 0, ratePerAgreementPerYearGbp = 0 } = payment

  const unitPaymentPence = gbpToPence(ratePerUnitGbp) * action.quantity
  const agreementPaymentPence = gbpToPence(ratePerAgreementPerYearGbp)
  const annualTotalPence = unitPaymentPence + agreementPaymentPence

  return {
    annualTotalPence,
    totalPence: durationYears * annualTotalPence
  }
}

const calculatePaymentForParcel = (parcelActions, actions) => {
  let parcelTotalPence = 0
  let parcelAnnualTotalPence = 0

  for (const action of parcelActions) {
    const actionData = findActionByCode(actions, action.code)
    const { annualTotalPence, totalPence } = calculatePaymentForAction(
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

export const calculateTotalPayments = (parcels, actions) => {
  let agreementTotalPence = 0
  let annualTotalPence = 0

  for (const parcel of parcels) {
    const { parcelTotalPence, parcelAnnualTotalPence } =
      calculatePaymentForParcel(parcel.actions, actions)
    agreementTotalPence += parcelTotalPence
    annualTotalPence += parcelAnnualTotalPence
  }

  return {
    annualTotalPence,
    agreementTotalPence
  }
}

export const calculateScheduledPayments = (
  parcelItems,
  agreementLevelItems,
  schedule
) => {
  const scheduleLength = schedule.length
  const scheduledPayments = schedule.map((date) => {
    const lineItems = []
    let totalPaymentPence = 0

    Object.entries(parcelItems).forEach(([id, parcelItem]) => {
      const paymentPence =
        (parcelItem.quantity * parcelItem.rateInPence) / scheduleLength
      lineItems.push({
        parcelItemId: Number(id),
        paymentPence
      })
      totalPaymentPence += paymentPence
    })

    Object.entries(agreementLevelItems).forEach(([id, agreementItem]) => {
      const paymentPence = agreementItem.annualPaymentPence / scheduleLength
      lineItems.push({
        agreementLevelItemId: Number(id),
        paymentPence
      })
      totalPaymentPence += paymentPence
    })

    return {
      totalPaymentPence,
      paymentDate: date,
      lineItems
    }
  })

  return scheduledPayments
}

const createParcelPaymentItem = (action, actionData, parcel) => ({
  code: actionData?.code,
  description: actionData?.description,
  unit: actionData?.applicationUnitOfMeasurement,
  quantity: action.quantity,
  rateInPence: gbpToPence(actionData?.payment.ratePerUnitGbp),
  annualPaymentPence:
    gbpToPence(actionData?.payment.ratePerUnitGbp) * action.quantity,
  sheetId: parcel.sheetId,
  parcelId: parcel.parcelId
})

const createAgreementPaymentItem = (actionData) => ({
  code: actionData?.code,
  description: actionData?.description,
  annualPaymentPence: gbpToPence(actionData?.payment.ratePerAgreementPerYearGbp)
})

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
        parcel,
        index
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
