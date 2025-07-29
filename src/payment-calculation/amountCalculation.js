const gbpToPence = (gbp = 0) => gbp * 100

const findActionByCode = (actions, code) => {
  const action = actions.find((a) => a.code === code)
  if (!action) {
    throw new Error(`Action with code '${code}' not found`)
  }
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

export const calculatePayments = (parcels, actions) => {
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

const createParcelPaymentItem = (action, actionData, parcel) => ({
  code: actionData.code,
  description: actionData.description,
  unit: actionData.applicationUnitOfMeasurement,
  quantity: action.quantity,
  rateInPence: gbpToPence(actionData.payment.ratePerUnitGbp),
  annualPaymentPence: gbpToPence(actionData.payment.ratePerAgreementPerYearGbp),
  sheetId: parcel.sheetId,
  parcelId: parcel.parcelId
})

const createAgreementPaymentItem = (actionData) => ({
  code: actionData.code,
  description: actionData.description,
  annualPaymentPence: gbpToPence(actionData.payment.ratePerAgreementPerYearGbp)
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

      if (actionData.payment.ratePerAgreementPerYearGbp) {
        paymentItems.agreementItems[parcelKey] =
          createAgreementPaymentItem(actionData)
      }
    }
  })

  return paymentItems
}
