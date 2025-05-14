export default [
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
  },
  {
    version: 1,
    startDate: '2025-01-01',
    code: 'UPL1',
    description: 'UPL1: Moderate livestock grazing on moorland',
    applicationUnitOfMeasurement: 'ha',
    payment: {
      ratePerUnitGbp: 0,
      ratePerAgreementPerYearGbp: 0
    },
    landCoverCodes: [],
    landCoverClassCodes: [],
    rules: []
  },
  {
    version: 1,
    startDate: '2025-01-01',
    code: 'UPL2',
    description: 'UPL2: Low livestock grazing on moorland',
    applicationUnitOfMeasurement: 'ha',
    payment: {
      ratePerUnitGbp: 0,
      ratePerAgreementPerYearGbp: 0
    },
    landCoverCodes: [],
    landCoverClassCodes: [],
    rules: []
  },
  {
    version: 1,
    startDate: '2025-01-01',
    code: 'UPL3',
    description: 'UPL3: Limited livestock grazing on moorland',
    payment: {
      ratePerUnitGbp: 0,
      ratePerAgreementPerYearGbp: 0
    },
    landCoverCodes: [],
    landCoverClassCodes: [],
    rules: []
  },
  {
    version: 1,
    startDate: '2025-01-01',
    code: 'UPL4',
    description:
      'UPL4: Keep cattle and ponies on moorland supplement (minimum 30% GLU)',
    payment: {
      ratePerUnitGbp: 0,
      ratePerAgreementPerYearGbp: 0
    },
    landCoverCodes: [],
    landCoverClassCodes: [],
    rules: []
  },
  {
    version: 1,
    startDate: '2025-01-01',
    code: 'UPL5',
    description:
      'UPL5: Keep cattle and ponies on moorland supplement (minimum 70% GLU)',
    payment: {
      ratePerUnitGbp: 0,
      ratePerAgreementPerYearGbp: 0
    },
    landCoverCodes: [],
    landCoverClassCodes: [],
    rules: []
  },
  {
    version: 1,
    startDate: '2025-01-01',
    code: 'UPL6',
    description:
      'UPL6: Keep cattle and ponies on moorland supplement (100% GLU)',
    payment: {
      ratePerUnitGbp: 0,
      ratePerAgreementPerYearGbp: 0
    },
    landCoverCodes: [],
    landCoverClassCodes: [],
    rules: []
  },
  {
    version: 1,
    startDate: '2025-01-01',
    code: 'UPL7',
    description:
      'UPL7: Shepherding livestock on moorland (no required stock removal period)',
    payment: {
      ratePerUnitGbp: 0,
      ratePerAgreementPerYearGbp: 0
    },
    landCoverCodes: [],
    landCoverClassCodes: [],
    rules: []
  },
  {
    version: 1,
    startDate: '2025-01-01',
    code: 'UPL8',
    description:
      'UPL8: Shepherding livestock on moorland (remove stock for at least 4 months)',
    payment: {
      ratePerUnitGbp: 0,
      ratePerAgreementPerYearGbp: 0
    },
    landCoverCodes: [],
    landCoverClassCodes: [],
    rules: []
  },
  {
    version: 1,
    startDate: '2025-01-01',
    code: 'UPL9',
    description:
      'UPL9: Shepherding livestock on moorland (remove stock for at least 6 months)',
    payment: {
      ratePerUnitGbp: 0,
      ratePerAgreementPerYearGbp: 0
    },
    landCoverCodes: [],
    landCoverClassCodes: [],
    rules: []
  },
  {
    version: 1,
    startDate: '2025-01-01',
    code: 'SPM4',
    description:
      'SPM4: Keep native breeds on extensively managed habitats supplement (50-80%)',
    payment: {
      ratePerUnitGbp: 0,
      ratePerAgreementPerYearGbp: 0
    },
    landCoverCodes: [],
    landCoverClassCodes: [],
    rules: []
  },
  {
    version: 1,
    startDate: '2025-01-01',
    code: 'SPM5',
    description:
      'SPM5: Keep native breeds on extensively managed habitats supplement (more than 80%)',
    payment: {
      ratePerUnitGbp: 0,
      ratePerAgreementPerYearGbp: 0
    },
    landCoverCodes: [],
    landCoverClassCodes: [],
    rules: []
  }
]
