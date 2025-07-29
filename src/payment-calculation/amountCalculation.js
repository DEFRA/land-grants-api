const calculatePaymentForParcel = (parcelActions, actions) => {
  let parcelTotalPence = 0
  let parcelAnnualTotalPence = 0

  for (const action of parcelActions) {
    const actionData = actions.find((a) => a.code === action.code)

    const {
      durationYears,
      payment: { ratePerUnitGbp = 0, ratePerAgreementPerYearGbp = 0 }
    } = actionData

    const actionAnnualTotalPence =
      ratePerUnitGbp * 100 * action.quantity + ratePerAgreementPerYearGbp * 100
    parcelTotalPence += durationYears * actionAnnualTotalPence
    parcelAnnualTotalPence += actionAnnualTotalPence
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

export const createPaymentItems = (parcels, actions) => {
  const paymentItems = {
    parcelItems: {},
    agreementItems: {}
  }

  for (let i = 0; i < parcels.length; i++) {
    for (const action of parcels[i].actions) {
      const actionData = actions.find((a) => a.code === action.code)

      paymentItems.parcelItems[i + 1] = {
        code: actionData.code,
        description: actionData.description,
        unit: actionData.applicationUnitOfMeasurement,
        quantity: action.quantity,
        rateInPence: actionData.payment.ratePerUnitGbp * 100,
        annualPaymentPence: actionData.payment.ratePerAgreementPerYearGbp * 100,
        sheetId: parcels[i].sheetId,
        parcelId: parcels[i].parcelId
      }

      if (actionData.payment.ratePerAgreementPerYearGbp) {
        paymentItems.agreementItems[i + 1] = {
          code: actionData.code,
          description: actionData.description,
          annualPaymentPence:
            actionData.payment.ratePerAgreementPerYearGbp * 100
        }
      }
    }
  }
  return paymentItems
}
