import {
  actionResultTransformer,
  errorMessagesTransformer,
  applicationDataTransformer,
  ruleEngineApplicationTransformer,
  applicationValidationRunTransformer
} from './application.transformer.js'

describe('actionResultTransformer', () => {
  test('should transform action result correctly', () => {
    const action = { code: 'UPL1' }
    const actions = [
      { code: 'UPL1', actionConfigVersion: '1.0' },
      { code: 'SPM4', actionConfigVersion: '2.0' }
    ]
    const availableArea = {
      explanations: ['explanation1', 'explanation2'],
      availableAreaSqm: 10000
    }
    const ruleResult = {
      passed: true,
      results: { rule: 'test rule' }
    }

    const result = actionResultTransformer(
      action,
      actions,
      availableArea,
      ruleResult
    )

    expect(result).toEqual({
      hasPassed: true,
      code: 'UPL1',
      actionConfigVersion: '1.0',
      availableArea: {
        explanations: ['explanation1', 'explanation2'],
        areaInHa: 1
      },
      rules: [{ rule: 'test rule' }]
    })
  })

  test('should handle action not found in actions array', () => {
    const action = { code: 'UNKNOWN' }
    const actions = [{ code: 'UPL1', actionConfigVersion: '1.0' }]
    const availableArea = {
      explanations: [],
      availableAreaSqm: 5000
    }
    const ruleResult = {
      passed: false,
      results: { rule: 'test rule' }
    }

    const result = actionResultTransformer(
      action,
      actions,
      availableArea,
      ruleResult
    )

    expect(result).toEqual({
      hasPassed: false,
      code: 'UNKNOWN',
      actionConfigVersion: '',
      availableArea: {
        explanations: [],
        areaInHa: 0.5
      },
      rules: [{ rule: 'test rule' }]
    })
  })

  test('should handle zero available area', () => {
    const action = { code: 'UPL1' }
    const actions = [{ code: 'UPL1', actionConfigVersion: '1.0' }]
    const availableArea = {
      explanations: [],
      availableAreaSqm: 0
    }
    const ruleResult = {
      passed: true,
      results: { rule: 'test rule' }
    }

    const result = actionResultTransformer(
      action,
      actions,
      availableArea,
      ruleResult
    )

    expect(result.availableArea.areaInHa).toBe(0)
  })

  test('should handle negative available area', () => {
    const action = { code: 'UPL1' }
    const actions = [{ code: 'UPL1', actionConfigVersion: '1.0' }]
    const availableArea = {
      explanations: [],
      availableAreaSqm: -1000
    }
    const ruleResult = {
      passed: true,
      results: { rule: 'test rule' }
    }

    const result = actionResultTransformer(
      action,
      actions,
      availableArea,
      ruleResult
    )

    expect(result.availableArea.areaInHa).toBe(-0.1)
  })
})

describe('errorMessagesTransformer', () => {
  test('should transform error messages correctly', () => {
    const parcelResults = [
      {
        sheetId: 'S1',
        parcelId: 'P1',
        actions: [
          {
            code: 'UPL1',
            hasPassed: false,
            rules: [
              [
                { passed: false, reason: 'Area too small' },
                { passed: true, reason: 'Valid action' }
              ]
            ]
          },
          {
            code: 'SPM4',
            hasPassed: true,
            rules: [[{ passed: true, reason: 'Valid action' }]]
          }
        ]
      },
      {
        sheetId: 'S2',
        parcelId: 'P2',
        actions: [
          {
            code: 'CMOR1',
            hasPassed: false,
            rules: [[{ passed: false, reason: 'Invalid configuration' }]]
          }
        ]
      }
    ]

    const result = errorMessagesTransformer(parcelResults)

    expect(result).toEqual([
      {
        code: 'UPL1',
        description: 'Area too small',
        sheetId: 'S1',
        parcelId: 'P1',
        passed: false
      },
      {
        code: 'CMOR1',
        description: 'Invalid configuration',
        sheetId: 'S2',
        parcelId: 'P2',
        passed: false
      }
    ])
  })

  test('should return empty array when all actions pass', () => {
    const parcelResults = [
      {
        sheetId: 'S1',
        parcelId: 'P1',
        actions: [
          {
            code: 'UPL1',
            hasPassed: true,
            rules: [[{ passed: true, reason: 'Valid action' }]]
          }
        ]
      }
    ]

    const result = errorMessagesTransformer(parcelResults)

    expect(result).toEqual([])
  })

  test('should return empty array when parcelResults is empty', () => {
    const result = errorMessagesTransformer([])
    expect(result).toEqual([])
  })

  test('should handle actions with no rules', () => {
    const parcelResults = [
      {
        sheetId: 'S1',
        parcelId: 'P1',
        actions: [
          {
            code: 'UPL1',
            hasPassed: false,
            rules: []
          }
        ]
      }
    ]

    const result = errorMessagesTransformer(parcelResults)

    expect(result).toEqual([])
  })

  test('should handle actions with empty rules array', () => {
    const parcelResults = [
      {
        sheetId: 'S1',
        parcelId: 'P1',
        actions: [
          {
            code: 'UPL1',
            hasPassed: false,
            rules: [[]]
          }
        ]
      }
    ]

    const result = errorMessagesTransformer(parcelResults)

    expect(result).toEqual([])
  })
})

describe('applicationDataTransformer', () => {
  const mockDate = new Date('2023-01-01T00:00:00.000Z')
  const originalDate = Date

  beforeEach(() => {
    global.Date = jest.fn(() => mockDate)
    global.Date.now = originalDate.now
  })

  afterEach(() => {
    global.Date = originalDate
  })

  test('should transform application data when all parcels pass', () => {
    const applicationId = 'APP123'
    const applicantCrn = 'CRN456'
    const sbi = 'SBI789'
    const requester = 'test@example.com'
    const landActions = [
      {
        sheetId: 'S1',
        parcelId: 'P1',
        actions: [
          { code: 'UPL1', hasPassed: true },
          { code: 'SPM4', hasPassed: true }
        ]
      }
    ]
    const parcelResults = [
      {
        sheetId: 'S1',
        parcelId: 'P1',
        actions: [
          { code: 'UPL1', hasPassed: true },
          { code: 'SPM4', hasPassed: true }
        ]
      }
    ]

    const result = applicationDataTransformer(
      applicationId,
      applicantCrn,
      sbi,
      requester,
      landActions,
      parcelResults
    )

    expect(result).toEqual({
      date: mockDate,
      applicationId: 'APP123',
      applicantCrn: 'CRN456',
      sbi: 'SBI789',
      requester: 'test@example.com',
      landGrantsApiVersion: process.env.SERVICE_VERSION ?? 'unknown',
      hasPassed: true,
      applicationLevelResults: {},
      application: {
        agreementLevelActions: [],
        parcels: [
          {
            sheetId: 'S1',
            parcelId: 'P1',
            actions: [
              { code: 'UPL1', hasPassed: true },
              { code: 'SPM4', hasPassed: true }
            ]
          }
        ]
      },
      parcelLevelResults: parcelResults
    })
  })

  test('should transform application data when some parcels fail', () => {
    const applicationId = 'APP123'
    const applicantCrn = 'CRN456'
    const sbi = 'SBI789'
    const requester = 'test@example.com'
    const landActions = [
      {
        sheetId: 'S1',
        parcelId: 'P1',
        actions: [
          { code: 'UPL1', hasPassed: true },
          { code: 'SPM4', hasPassed: false }
        ]
      }
    ]
    const parcelResults = [
      {
        sheetId: 'S1',
        parcelId: 'P1',
        actions: [
          { code: 'UPL1', hasPassed: true },
          { code: 'SPM4', hasPassed: false }
        ]
      }
    ]

    const result = applicationDataTransformer(
      applicationId,
      applicantCrn,
      sbi,
      requester,
      landActions,
      parcelResults
    )

    expect(result.hasPassed).toBe(false)
  })

  test('should handle empty landActions and parcelResults', () => {
    const applicationId = 'APP123'
    const applicantCrn = 'CRN456'
    const sbi = 'SBI789'
    const requester = 'test@example.com'
    const landActions = []
    const parcelResults = []

    const result = applicationDataTransformer(
      applicationId,
      applicantCrn,
      sbi,
      requester,
      landActions,
      parcelResults
    )

    expect(result.hasPassed).toBe(true)
    expect(result.application.parcels).toEqual([])
    expect(result.parcelLevelResults).toEqual([])
  })

  test('should handle multiple parcels with mixed results', () => {
    const applicationId = 'APP123'
    const applicantCrn = 'CRN456'
    const sbi = 'SBI789'
    const requester = 'test@example.com'
    const landActions = [
      {
        sheetId: 'S1',
        parcelId: 'P1',
        actions: [{ code: 'UPL1', hasPassed: true }]
      },
      {
        sheetId: 'S2',
        parcelId: 'P2',
        actions: [{ code: 'SPM4', hasPassed: false }]
      }
    ]
    const parcelResults = [
      {
        sheetId: 'S1',
        parcelId: 'P1',
        actions: [{ code: 'UPL1', hasPassed: true }]
      },
      {
        sheetId: 'S2',
        parcelId: 'P2',
        actions: [{ code: 'SPM4', hasPassed: false }]
      }
    ]

    const result = applicationDataTransformer(
      applicationId,
      applicantCrn,
      sbi,
      requester,
      landActions,
      parcelResults
    )

    expect(result.hasPassed).toBe(false)
    expect(result.application.parcels).toHaveLength(2)
  })
})

describe('ruleEngineApplicationTransformer', () => {
  test('should transform rule engine application correctly', () => {
    const areaAppliedFor = 100
    const code = 'UPL1'
    const area = 500
    const intersectingAreaPercentage = 25.5
    const existingAgreements = [
      { id: 'AG1', type: 'agreement1' },
      { id: 'AG2', type: 'agreement2' }
    ]

    const result = ruleEngineApplicationTransformer(
      areaAppliedFor,
      code,
      area,
      intersectingAreaPercentage,
      existingAgreements
    )

    expect(result).toEqual({
      areaAppliedFor: 100,
      actionCodeAppliedFor: 'UPL1',
      landParcel: {
        area: 500,
        existingAgreements: [
          { id: 'AG1', type: 'agreement1' },
          { id: 'AG2', type: 'agreement2' }
        ],
        intersections: {
          moorland: { intersectingAreaPercentage: 25.5 }
        }
      }
    })
  })

  test('should handle zero values', () => {
    const result = ruleEngineApplicationTransformer(0, 'UPL1', 0, 0, [])

    expect(result).toEqual({
      areaAppliedFor: 0,
      actionCodeAppliedFor: 'UPL1',
      landParcel: {
        area: 0,
        existingAgreements: [],
        intersections: {
          moorland: { intersectingAreaPercentage: 0 }
        }
      }
    })
  })

  test('should handle negative values', () => {
    const result = ruleEngineApplicationTransformer(
      -100,
      'UPL1',
      -500,
      -25.5,
      []
    )

    expect(result).toEqual({
      areaAppliedFor: -100,
      actionCodeAppliedFor: 'UPL1',
      landParcel: {
        area: -500,
        existingAgreements: [],
        intersections: {
          moorland: { intersectingAreaPercentage: -25.5 }
        }
      }
    })
  })

  test('should handle null and undefined values', () => {
    const result = ruleEngineApplicationTransformer(
      null,
      'UPL1',
      undefined,
      0,
      null
    )

    expect(result).toEqual({
      areaAppliedFor: null,
      actionCodeAppliedFor: 'UPL1',
      landParcel: {
        area: undefined,
        existingAgreements: null,
        intersections: {
          moorland: { intersectingAreaPercentage: 0 }
        }
      }
    })
  })

  test('should handle empty existingAgreements array', () => {
    const result = ruleEngineApplicationTransformer(100, 'UPL1', 500, 25.5, [])

    expect(result.landParcel.existingAgreements).toEqual([])
  })

  test('should handle complex existingAgreements', () => {
    const existingAgreements = [
      { id: 'AG1', type: 'agreement1', status: 'active' },
      {
        id: 'AG2',
        type: 'agreement2',
        status: 'inactive',
        details: { amount: 1000 }
      }
    ]

    const result = ruleEngineApplicationTransformer(
      100,
      'UPL1',
      500,
      25.5,
      existingAgreements
    )

    expect(result.landParcel.existingAgreements).toEqual(existingAgreements)
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
