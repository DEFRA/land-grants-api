export const getAgreementsBySbiQuery = `
  query GetBusiness($sbi: ID!) {
    business(sbi: $sbi) {
      agreements {
        contractId
        name
        status
        contractType
        schemeYear
        startDate
        endDate
        paymentSchedules {
          optionCode
          optionDescription
          commitmentGroupStartDate
          commitmentGroupEndDate
          year
          sheetName
          parcelName
          actionArea
          actionMTL
          actionUnits
          parcelTotalArea
          startDate
          endDate
        }
      }
    }
  }
`
