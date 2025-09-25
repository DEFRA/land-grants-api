import {
  applicationTransformer,
  mapActionResults,
  applicationValidationRunTransformer
} from './application.transformer.js'

describe('applicationTransformer', () => {
  test('should transform application data correctly', () => {
    const application = {
      requester: 'grants-ui',
      hasPassed: true,
      applicantCrn: '345',
      landActions: [
        {
          sheetId: 'SX0679',
          parcelId: '9238',
          actions: [
            {
              code: 'ACTION1',
              quantity: 100
            }
          ]
        }
      ],
      validationResults: [
        {
          sheetId: 'SX0679',
          parcelId: '9238',
          actions: [
            {
              code: 'ACTION1',
              passed: true,
              rule: 'rule-name',
              description: 'rule-description',
              availableArea: {
                explanations: [],
                areaInHa: 567
              }
            }
          ]
        }
      ]
    }

    const result = applicationTransformer(application)

    expect(result).toEqual({
      date: expect.any(Date),
      requester: 'grants-ui',
      hasPassed: true,
      landGrantsApiVersion: process.env.SERVICE_VERSION ?? 'unknown',
      applicationLevelResults: {},
      application: {
        agreementLevelActions: [],
        parcels: [
          {
            sheetId: 'SX0679',
            parcelId: '9238',
            actions: [
              {
                code: 'ACTION1',
                quantity: 100
              }
            ]
          }
        ]
      },
      parcelLevelResults: [
        {
          sheetId: 'SX0679',
          parcelId: '9238',
          actions: [
            {
              code: 'ACTION1',
              hasPassed: true,
              actionConfigVersion: '',
              availableArea: {
                areaInHa: 0.0567
              },
              rules: [
                {
                  name: 'rule-name',
                  hasPassed: true,
                  reason: 'rule-description',
                  explanations: []
                }
              ]
            }
          ]
        }
      ]
    })
  })
})

describe('mapActionResults', () => {
  test('should map action results correctly', () => {
    const actions = [
      {
        code: 'ACTION1',
        passed: true,
        rule: 'rule-name',
        description: 'rule-description',
        availableArea: {
          explanations: [],
          areaInHa: 0
        }
      }
    ]
    const result = mapActionResults(actions)
    expect(result).toEqual([
      {
        code: 'ACTION1',
        hasPassed: true,
        actionConfigVersion: '',
        availableArea: {
          areaInHa: 0
        },
        rules: [
          {
            name: 'rule-name',
            hasPassed: true,
            reason: 'rule-description',
            explanations: []
          }
        ]
      }
    ])
  })

  test('should map multiple actions and rules correctly', () => {
    const actions = [
      {
        code: 'ACTION1',
        passed: true,
        rule: 'rule-1',
        description: 'rule-description',
        availableArea: {
          explanations: [],
          areaInHa: 567
        }
      },
      {
        code: 'ACTION1',
        passed: false,
        rule: 'rule-2',
        description: 'rule-description-2',
        availableArea: {
          explanations: [],
          areaInHa: 567
        }
      },
      {
        code: 'ACTION2',
        passed: true,
        rule: 'rule-1',
        description: 'rule-description',
        availableArea: {
          explanations: [],
          areaInHa: 567
        }
      }
    ]
    const result = mapActionResults(actions)
    expect(result).toEqual([
      {
        code: 'ACTION1',
        hasPassed: false,
        actionConfigVersion: '',
        availableArea: {
          areaInHa: 0.0567
        },
        rules: [
          {
            name: 'rule-1',
            hasPassed: true,
            reason: 'rule-description',
            explanations: []
          },
          {
            name: 'rule-2',
            hasPassed: false,
            reason: 'rule-description-2',
            explanations: []
          }
        ]
      },
      {
        code: 'ACTION2',
        hasPassed: true,
        actionConfigVersion: '',
        availableArea: {
          areaInHa: 0.0567
        },
        rules: [
          {
            name: 'rule-1',
            hasPassed: true,
            reason: 'rule-description',
            explanations: []
          }
        ]
      }
    ])
  })
})

describe('applicationValidationRunTransformer', () => {
  test('should transform simple detail validation run correctly', () => {
    const applicationValidationRuns = [
      {
        id: 1,
        created_at: '2024-01-15T10:30:00Z',
        ignore: true
      }
    ]

    const result = applicationValidationRunTransformer(
      applicationValidationRuns
    )

    expect(result).toEqual([
      {
        id: 1,
        created_at: '2024-01-15T10:30:00Z'
      }
    ])
  })

  test('should handle empty array', () => {
    const applicationValidationRuns = []

    const result = applicationValidationRunTransformer(
      applicationValidationRuns
    )

    expect(result).toEqual([])
  })
})
