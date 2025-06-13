import { applicationUnitOfMeasurement } from '~/src/api/common/helpers/measurement.js'

const mockActions = [
  {
    version: 1,
    startDate: '2025-01-01',
    code: 'CMOR1',
    description: 'CMOR1: Assess moorland and produce a written record',
    applicationUnitOfMeasurement,
    payment: {
      ratePerUnitGbp: 10.6,
      ratePerAgreementPerYearGbp: 272
    },
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

const mockMultipleActions = [
  {
    version: 1,
    startDate: '2025-01-01',
    code: 'UPL1',
    description: 'UPL1: Moderate livestock grazing on moorland',
    applicationUnitOfMeasurement,
    payment: {
      'rate-per-unit-gbp': 20
    },
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
  },
  {
    version: 1,
    startDate: '2025-01-01',
    code: 'CMOR1',
    description: 'CMOR1: Assess moorland and produce a written record',
    applicationUnitOfMeasurement,
    payment: {
      ratePerUnitGbp: 10.6,
      ratePerAgreementPerYearGbp: 272
    },
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
  },
  {
    version: 1,
    startDate: '2025-01-01',
    code: 'UPL2',
    description: 'UPL2: Low livestock grazing on moorland',
    applicationUnitOfMeasurement,
    payment: {
      'rate-per-unit-gbp': 53
    },
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
          quantity: 99.0
        },
        {
          code: 'BND2',
          quantity: 200.0
        }
      ]
    }
  ]
}

const application = {
  sheetId: 'SX0679',
  parcelId: '9238',
  sbi: '123456789',
  actions: [
    {
      code: 'BND1',
      quantity: 99.0
    },
    {
      code: 'BND2',
      quantity: 200.0
    }
  ],
  intersections: {
    moorland: 50
  }
}

export { mockActions, mockMultipleActions, mockLandActions, application }
