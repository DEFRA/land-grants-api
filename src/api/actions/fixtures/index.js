import { applicationUnitOfMeasurement } from '~/src/api/common/helpers/measurement.js'

const mockActionConfig = [
  {
    version: 1,
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

export { mockActionConfig }
