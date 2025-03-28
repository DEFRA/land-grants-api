export default [
  {
    sheetId: 'SX0679',
    parcelId: '9238',
    sbi: '123456789',
    actions: [
      {
        code: 'BND1',
        description: 'BND1: Maintain dry stone walls',
        durationYears: 3,
        payment: {
          type: 'Revenue',
          value: 30,
          unit: '100 metres',
          additionalPaymentPerAgreement: 95
        },
        validLandCovers: ['Arable', 'Grassland', 'Woodland'],
        eligibilityRules: [
          { id: 'is-below-moorland-line' },
          { id: 'is-for-whole-parcel-area' }
        ]
      }
    ]
  },
  {
    sheetId: 'SX0680',
    parcelId: '9238',
    sbi: '123456789',
    actions: [
      {
        code: 'BND2',
        description: 'BND2: Maintain earth banks or stone-faced hedgebanks',
        durationYears: 3,
        payment: {
          type: 'Revenue',
          value: 11,
          unit: '100 metres',
          additionalPaymentPerAgreement: 95
        },
        validLandCovers: ['Arable', 'Grassland', 'Woodland'],
        eligibilityRules: [
          { id: 'is-below-moorland-line' },
          { id: 'is-for-whole-parcel-area' }
        ]
      }
    ]
  }
]
