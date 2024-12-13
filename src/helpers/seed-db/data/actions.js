import { codes } from './codes.js'

const deepSearch = (data, value) => {
  if (data.code === value) {
    if (!data.uses) return data.code
    else return data.uses.map((use) => use.code)
  }

  for (const key of ['classes', 'covers', 'uses']) {
    if (data[key]) {
      for (const item of data[key]) {
        const result = deepSearch(item, value)
        if (result) return result
      }
    }
  }

  return null
}

export const populateActionClasses = (actions) =>
  actions.map((action) => ({
    ...action,
    uses: action.uses.flatMap((targetCode) => deepSearch(codes[0], targetCode))
  }))

export const actions = [
  {
    code: 'SAM1',
    description:
      'Assess soil, test soil organic matter and produce a soil management plan',
    uses: ['AC32', 'PG01', 'TG01'],
    payment: {
      amountPerHectare: 5.8,
      additionalPaymentPerAgreement: 95
    },
    eligibilityRules: [
      { id: 'is-below-moorland-line' },
      { id: 'is-for-whole-parcel-area' }
    ]
  },
  {
    code: 'SAM2',
    description: 'Multi-species winter cover crop',
    uses: ['AC32', 'TG01'],
    payment: {
      amountPerHectare: 129
    },
    eligibilityRules: [{ id: 'is-below-moorland-line' }]
  },
  {
    code: 'SAM3',
    description: 'Herbal leys',
    uses: ['PG01', 'TG01'],
    payment: {
      amountPerHectare: 382
    },
    eligibilityRules: [{ id: 'is-below-moorland-line' }]
  },
  {
    code: 'LIG1',
    description:
      'Manage grassland with very low nutrient inputs (outside SDAs)',
    uses: ['PG01', 'TG01'],
    payment: {
      amountPerHectare: 151
    },
    eligibilityRules: [{ id: 'is-outside-sda' }]
  },
  {
    code: 'LIG2',
    description: 'Manage grassland with very low nutrient inputs (SDAs)',
    uses: ['PG01', 'TG01'],
    payment: {
      amountPerHectare: 151
    },
    eligibilityRules: [{ id: 'is-inside-sda' }]
  },
  {
    code: 'CIGL1',
    description: 'Take grassland field corners or blocks out of management',
    uses: ['PG01', 'TG01'],
    payment: {
      amountPerHectare: 333
    },
    eligibilityRules: [{ id: 'is-below-moorland-line' }]
  },
  {
    code: 'AB3',
    description: 'Beetle banks',
    uses: ['AC32', 'TG01'],
    payment: {
      amountPerHectare: 573
    },
    eligibilityRules: [{ id: 'is-below-moorland-line' }]
  },
  {
    code: 'GRH7',
    description: 'Haymaking supplement',
    uses: ['AC32', 'PG01', 'TG01'],
    payment: {
      amountPerHectare: 157
    },
    eligibilityRules: [
      {
        id: 'supplement-area-matches-parent',
        config: { baseActions: ['CLIG3', 'LIG1', 'LIG2', 'GRH6'] }
      }
    ]
  },
  {
    code: 'GRH1',
    description: 'Manage rough grazing for birds',
    uses: ['PG01'],
    payment: {
      amountPerHectare: 121.0
    },
    eligibilityRules: [
      {
        id: 'has-min-parcel-area',
        config: { minArea: 2 }
      },
      { id: 'is-below-moorland-line' }
    ]
  },
  {
    code: 'CSAM1',
    description:
      'Assess soil, produce a soil management plan and test soil organic matter',
    uses: ['AC32', 'PG01', 'TG01'],
    payment: {
      amountPerHectare: 6,
      additionalPaymentPerAgreement: 97
    },
    eligibilityRules: [
      { id: 'is-below-moorland-line' },
      { id: 'is-for-whole-parcel-area' }
    ]
  },
  {
    code: 'CSAM2',
    description: 'Multi-species winter cover crop',
    uses: ['AC32', 'TG01'],
    payment: {
      amountPerHectare: 129
    },
    eligibilityRules: [{ id: 'is-below-moorland-line' }]
  },
  {
    code: 'CSAM3',
    description: 'Herbal leys',
    uses: ['AC32', 'PG01', 'TG01'],
    payment: {
      amountPerHectare: 382
    },
    eligibilityRules: [{ id: 'is-below-moorland-line' }]
  },
  {
    code: 'CLIG3',
    description: 'Manage grassland with very low nutrient inputs',
    uses: ['AC32', 'PG01', 'TG01'],
    payment: {
      amountPerHectare: 151
    },
    eligibilityRules: [
      { id: 'is-below-moorland-line' },
      {
        id: 'total-area-with-exception',
        config: { incompatibleAction: 'CIGL1' }
      }
    ]
  }
]
