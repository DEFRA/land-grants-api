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

const mockActions = [
  {
    code: 'CSAM1',
    description:
      'CSAM1: Assess soil, produce a soil management plan and test soil organic matter',
    availableArea: {
      unit: 'ha',
      value: 0
    }
  }
]

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
        code: 'CSAM1',
        description:
          'CSAM1: Assess soil, produce a soil management plan and test soil organic matter',
        availableArea: {
          unit: 'ha',
          value: 200
        }
      }
    ]
  }
}

export { mockParcel, mockActions, mockParcelWithActions }
