const applicationUnitOfMeasurement = 'ha'

const landCoverClassCodes = [
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
]

const moorlandRule = {
  name: 'parcel-has-intersection-with-data-layer',
  description: 'Is this parcel on the moorland?',
  version: '1.0.0',
  config: {
    layerName: 'moorland',
    minimumIntersectionPercent: 50,
    tolerancePercent: 1
  }
}

const lessFavouredAreaRule = {
  name: 'parcel-is-on-less-favoured-area',
  type: 'parcel-has-intersection-with-data-layer',
  description: 'Is this parcel fully within a Less Favoured Area (LFA)?',
  version: '1.0.0',
  config: {
    layerName: 'lfa',
    minimumIntersectionPercent: 100,
    tolerancePercent: 1,
    failureMessage:
      'It is not possible to select this action because the land parcel is not fully within a Less Favoured Area (LFA)'
  }
}

const sssiConsentRule = {
  name: 'sssi-consent-required',
  description: 'Is the site of special scientific interest?',
  version: '1.0.0',
  config: {
    layerName: 'sssi',
    tolerancePercent: 1,
    caveatDescription: 'A consent is required from Natural England'
  }
}

const totalAvailableAreaRule = {
  name: 'applied-for-total-available-area',
  description: 'Has the total available area been applied for?',
  version: '1.0.0'
}

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
    guidanceUrl:
      'https://www.gov.uk/find-funding-for-land-or-farms/cmor1-assess-moorland-and-produce-a-written-record',
    availability: { type: 'total' },
    payment: {
      ratePerUnitGbp: 10.6,
      ratePerAgreementPerYearGbp: 272
    },
    landCoverClassCodes,
    rules: [
      moorlandRule,
      lessFavouredAreaRule,
      sssiConsentRule,
      totalAvailableAreaRule
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
    guidanceUrl:
      'https://www.gov.uk/find-funding-for-land-or-farms/upl1-moderate-livestock-grazing-on-moorland',
    availability: { type: 'partial' },
    payment: {
      ratePerUnitGbp: 20
    },
    landCoverClassCodes,
    rules: [
      moorlandRule,
      lessFavouredAreaRule,
      sssiConsentRule,
      totalAvailableAreaRule
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
    guidanceUrl:
      'https://www.gov.uk/find-funding-for-land-or-farms/upl2-low-livestock-grazing-on-moorland',
    availability: { type: 'partial' },
    payment: {
      ratePerUnitGbp: 53,
      ratePerAgreementPerYearGbp: 139
    },
    landCoverClassCodes,
    rules: [
      moorlandRule,
      lessFavouredAreaRule,
      sssiConsentRule,
      totalAvailableAreaRule
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
    applicationUnitOfMeasurement,
    durationYears: 3,
    landCoverClassCodes: [],
    startDate: '2025-01-01',
    version: 2,
    semanticVersion: '1.1.0',
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
