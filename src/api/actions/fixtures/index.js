const mockActions = [
  {
    version: 1,
    startDate: '2025-01-01',
    code: 'CMOR1',
    description: 'CMOR1: Assess moorland and produce a written record',
    applicationUnitOfMeasurement: 'ha',
    payment: {
      ratePerUnitGbp: 10.6,
      ratePerAgreementPerYearGbp: 272
    },
    landCoverCodes: [
      '131',
      '241',
      '243',
      '251',
      '252',
      '253',
      '271',
      '281',
      '282',
      '283',
      '285',
      '286',
      '287',
      '288',
      '300',
      '347',
      '582',
      '583',
      '591',
      '592',
      '593',
      '621',
      '641',
      '643',
      '651'
    ],
    landCoverClassCodes: [
      '130',
      '240',
      '250',
      '270',
      '280',
      '300',
      '330',
      '580',
      '590',
      '620',
      '640',
      '650'
    ],
    rules: [
      {
        name: 'parcel-has-intersection-with-data-layer',
        config: {
          layerName: 'moorland',
          minimumIntersectionPercent: 50,
          tolerancePercent: 1
        }
      },
      {
        name: 'applied-for-total-available-area'
      }
    ]
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
