import { populateActionClasses } from './actions.js'

describe('populateClasses', () => {
  test('should replace class IDs with an array of eligible Uses', () => {
    const populatedData = populateActionClasses([
      {
        code: 'TMP1',
        description: 'This is a made up action',
        uses: ['PG01', '118'],
        payment: {
          amountPerHectare: 5.8,
          additionalPaymentPerAgreement: 95
        },
        eligibilityRules: []
      }
    ])

    expect(populatedData[0].uses.includes('AC10')).toBeTruthy()
    expect(populatedData[0].uses).toHaveLength(101)
  })

  test('should work with multiple actions', () => {
    const populatedData = populateActionClasses([
      {
        code: 'TMP1',
        description: 'This is a made up action',
        uses: ['PG01', 'AC10'],
        payment: {
          amountPerHectare: 5.8,
          additionalPaymentPerAgreement: 95
        },
        eligibilityRules: []
      },
      {
        code: 'TMP2',
        description: 'This is a made up action',
        uses: ['PG01', 'AC10'],
        payment: {
          amountPerHectare: 5.8,
          additionalPaymentPerAgreement: 95
        },
        eligibilityRules: []
      }
    ])

    expect(populatedData[0].uses.includes('AC10')).toBeTruthy()
    expect(populatedData[1].uses.includes('AC10')).toBeTruthy()
    expect(populatedData).toHaveLength(2)
  })
})
