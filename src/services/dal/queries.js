export const GET_BUSINESS = `
  query GetBusiness($sbi: ID!) {
    business(sbi: $sbi) {
      agreements {
        status
        paymentSchedules {
          optionCode
          sheetName
          parcelName
          actionArea
          actionMTL
          actionUnits
          startDate
          endDate
        }
      }
    }
  }
`
