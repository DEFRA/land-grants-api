import {
  applicationTransformer,
  mapActionResults
} from './application.transformer.js'

describe('applicationTransformer', () => {
  test('should transform application data correctly', () => {
    const application = {
      requester: 'grants-ui',
      hasPassed: true,
      applicantCrn: '345',
      landActions: [
        {
          sheet_id: 'SX0679',
          parcel_id: '9238',
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
              description: 'rule-description'
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
      landGrantsApiVersion: '0.0.0',
      application: {
        applicantCrn: '345',
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
              rules: [
                {
                  name: 'rule-name',
                  hasPassed: true,
                  reason: 'rule-description'
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
        description: 'rule-description'
      }
    ]
    const result = mapActionResults(actions)
    expect(result).toEqual([
      {
        code: 'ACTION1',
        hasPassed: true,
        actionConfigVersion: '',
        rules: [
          { name: 'rule-name', hasPassed: true, reason: 'rule-description' }
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
        description: 'rule-description'
      },
      {
        code: 'ACTION1',
        passed: false,
        rule: 'rule-2',
        description: 'rule-description-2'
      },
      {
        code: 'ACTION2',
        passed: true,
        rule: 'rule-1',
        description: 'rule-description'
      }
    ]
    const result = mapActionResults(actions)
    expect(result).toEqual([
      {
        code: 'ACTION1',
        hasPassed: false,
        actionConfigVersion: '',
        rules: [
          { name: 'rule-1', hasPassed: true, reason: 'rule-description' },
          { name: 'rule-2', hasPassed: false, reason: 'rule-description-2' }
        ]
      },
      {
        code: 'ACTION2',
        hasPassed: true,
        actionConfigVersion: '',
        rules: [{ name: 'rule-1', hasPassed: true, reason: 'rule-description' }]
      }
    ])
  })
})
