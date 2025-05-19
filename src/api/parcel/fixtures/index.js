const mockParcel = {
  sheetId: 'SX0679',
  parcelId: '9238',
  area: 300,
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
      value: 440
    },
    actions: [
      {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        availableArea: {
          unit: 'ha',
          value: 200
        }
      }
    ]
  }
}

export { mockParcel, mockParcelWithActions }
