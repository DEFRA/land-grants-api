const applicationUnitOfMeasurement = 'ha'

const cmor1 = {
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
}

const upl1 = {
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
const upl2 = {
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

export const wbd1 = {
  applicationUnitOfMeasurement: 'count',
  availability: {
    type: 'total'
  },
  code: 'WBD1',
  description: 'Manage ponds',
  display: true,
  displayOrder: 0,
  durationYears: 3,
  enabled: true,
  groupId: null,
  guidanceUrl:
    'https://www.gov.uk/find-funding-for-land-or-farms/wbd1-manage-ponds',
  payment: {
    ratePerUnitGbp: 257,
    ratePerAgreementPerYearGbp: 0
  },
  paymentMethod: {
    config: {
      ratePerUnitGbp: 257
    },
    name: 'default-calculation',
    version: '1.0.0'
  },
  rules: [
    {
      config: {
        caveatDescription: 'A hefer is needed from Historic England',
        layerName: 'historic_features',
        tolerancePercent: 0
      },
      description:
        'Does the site require a Historic Environment Farm Environment Record?',
      name: 'hefer-consent-required'
    },
    {
      config: {
        caveatDescription: 'A manual pond check is required'
      },
      description: 'Check that ponds on the land meet the action criteria',
      name: 'pond-check-required',
      type: 'manual-check-required'
    }
  ],
  semanticVersion: '1.0.0',
  startDate: '2026-10-18'
}

export const mockActionConfig = [cmor1, upl1, upl2, wbd1]

export const mockWoodlandManagementActionConfig = [
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
