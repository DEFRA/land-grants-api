const mockParcel = {
  sheet_id: 'SX0679',
  parcel_id: '9238',
  area_sqm: 300,
  features: [],
  landCovers: [
    {
      code: 'Arable',
      area: '300'
    }
  ],
  intersections: {
    sssi: {
      percent: 30,
      name: 'SSSI - Special Site of Scientific Interest'
    },
    moorland: {
      percent: 4,
      name: 'Moorland'
    }
  }
}

const mockParcelWithActions = {
  parcel: {
    parcelId: '9238',
    sheetId: 'SX0679',
    size: {
      unit: 'ha',
      value: 0.03
    },
    actions: [
      {
        code: 'CMOR1',
        description: 'Assess moorland and produce a written record',
        availability: {
          unit: 'ha',
          value: 0.02
        },
        ratePerUnitGbp: 10.6,
        ratePerAgreementPerYearGbp: 272
      }
    ]
  }
}

export { mockParcel, mockParcelWithActions }
