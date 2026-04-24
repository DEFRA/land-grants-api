import { applicationUnitOfMeasurement } from '~/src/features/common/helpers/measurement.js'

const mockActionConfig = [
  {
    version: 1,
    semanticVersion: '1.0.0',
    startDate: '2025-01-01',
    code: 'CMOR1',
    durationYears: 3,
    description: 'Assess moorland and produce a written record',
    applicationUnitOfMeasurement,
    enabled: true,
    display: true,
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
        description: 'Is this parcel on the moorland?',
        version: '1.0.0',
        config: {
          layerName: 'moorland',
          minimumIntersectionPercent: 50,
          tolerancePercent: 1
        }
      },
      {
        name: 'applied-for-total-available-area',
        description: 'Has the total available area been applied for?',
        version: '1.0.0'
      }
    ]
  },
  {
    version: 1,
    semanticVersion: '1.0.0',
    enabled: true,
    display: true,
    startDate: '2025-01-01',
    code: 'UPL1',
    durationYears: 3,
    description: 'UPL1: Moderate livestock grazing on moorland',
    applicationUnitOfMeasurement,
    payment: {
      ratePerUnitGbp: 20
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
        version: '1.0.0',
        config: {
          layerName: 'moorland',
          minimumIntersectionPercent: 50,
          tolerancePercent: 1
        }
      },
      {
        name: 'applied-for-total-available-area',
        version: '1.0.0'
      }
    ]
  },
  {
    version: 1,
    semanticVersion: '1.0.0',
    enabled: true,
    display: true,
    startDate: '2025-01-01',
    code: 'UPL2',
    durationYears: 3,
    description: 'UPL2: Low livestock grazing on moorland',
    applicationUnitOfMeasurement,
    payment: {
      ratePerUnitGbp: 53
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
        version: '1.0.0',
        config: {
          layerName: 'moorland',
          minimumIntersectionPercent: 50,
          tolerancePercent: 1
        }
      },
      {
        name: 'applied-for-total-available-area',
        version: '1.0.0'
      }
    ]
  }
]

const mockWoodlandManagementActionConfig = [
  {
    id: 17,
    enabled: true,
    display: false,
    code: 'PA3',
    description: 'Woodland management plan',
    payment: null,
    rules: [
      {
        name: 'parcel-has-minimum-eligibility-for-woodland-management-plan',
        config: {
          minimumSize: 0.5,
          minOldWoodlandHa: 0.4
        },
        description:
          'Is the parcel eligible for the woodland management plan action?'
      },
      {
        name: 'total-area-not-exceed-land-parcels-woodland-management-plan',
        description:
          'Is the total woodland area less than or equal to the total land parcel area?'
      }
    ],
    applicationUnitOfMeasurement: 'ha',
    durationYears: 10,
    landCoverClassCodes: [],
    startDate: '2025-01-01',
    version: 1,
    semanticVersion: '1.0.0',
    paymentMethod: {
      name: 'wmp-calculation',
      config: {
        tiers: [
          {
            flatRateGbp: 1500,
            lowerLimitHa: 0.5,
            upperLimitHa: 50,
            ratePerUnitGbp: 0
          },
          {
            flatRateGbp: 1500,
            lowerLimitHa: 50,
            upperLimitHa: 100,
            ratePerUnitGbp: 30
          },
          {
            flatRateGbp: 3000,
            lowerLimitHa: 100,
            upperLimitHa: null,
            ratePerUnitGbp: 15
          }
        ],
        newWoodlandMaxPercent: 20
      },
      version: '1.0.0'
    }
  }
]

export { mockActionConfig, mockWoodlandManagementActionConfig }
