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

const mockLandActions = {
  landActions: [
    {
      sheetId: 'SX0679',
      parcelId: '9238',
      sbi: '123456789',
      actions: [
        {
          code: 'BND1',
          quantity: 99
        },
        {
          code: 'BND2',
          quantity: 200
        }
      ]
    }
  ]
}

export { mockActions, mockLandActions }
