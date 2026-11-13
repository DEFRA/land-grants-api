import {
  actionResultTransformer,
  applicationDataTransformer,
  applicationValidationRunTransformer
} from './application.transformer.js'
import {
  BOTH_SIDES,
  SINGLE_SIDE
} from '~/src/features/common/constants/sidedness.js'

const sbi = '800000001'
const crn = '9000000001'

describe('actionResultTransformer', () => {
  test('should transform action result correctly', () => {
    const action = { code: 'UPL1' }
    const actions = [
      { code: 'UPL1', semanticVersion: '1.0.0' },
      { code: 'SPM4', semanticVersion: '2.0.0' }
    ]
    const availableArea = {
      explanations: ['explanation1', 'explanation2'],
      availableAreaSqm: 10000
    }
    const ruleResult = {
      passed: true,
      results: [{ rule: 'test rule' }]
    }

    const result = actionResultTransformer({
      action,
      actions,
      availableArea,
      ruleResult
    })

    expect(result).toEqual({
      hasPassed: true,
      code: 'UPL1',
      actionConfigVersion: '1.0.0',
      availableArea: {
        explanations: ['explanation1', 'explanation2'],
        areaInHa: 1
      },
      availableLength: null,
      rules: [{ rule: 'test rule' }]
    })
  })

  test('should handle action not found in actions array', () => {
    const action = { code: 'UNKNOWN' }
    const actions = [{ code: 'UPL1', semanticVersion: '1.0.0' }]
    const availableArea = {
      explanations: [],
      availableAreaSqm: 5000
    }
    const ruleResult = {
      passed: false,
      results: [{ rule: 'test rule' }]
    }

    const result = actionResultTransformer({
      action,
      actions,
      availableArea,
      ruleResult
    })

    expect(result).toEqual({
      hasPassed: false,
      code: 'UNKNOWN',
      actionConfigVersion: undefined,
      availableArea: {
        explanations: [],
        areaInHa: 0.5
      },
      availableLength: null,
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

    const result = actionResultTransformer({
      action,
      actions,
      availableArea,
      ruleResult
    })

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

    const result = actionResultTransformer({
      action,
      actions,
      availableArea,
      ruleResult
    })

    expect(result.availableArea.areaInHa).toBe(-0.1)
  })

  test('should handle null available area', () => {
    const action = { code: 'WBD1' }
    const actions = [
      {
        code: 'WBD1',
        actionConfigVersion: '1.0',
        applicationUnitOfMeasurement: 'count'
      }
    ]
    const ruleResult = {
      passed: true,
      results: { rule: 'test rule' }
    }

    const result = actionResultTransformer({
      action,
      actions,
      availableArea: null,
      ruleResult
    })

    expect(result.availableArea).toBe(null)
  })

  describe('for a linear action', () => {
    const action = { code: 'BND2' }
    const actions = [{ code: 'BND2', semanticVersion: '1.1.0' }]
    const ruleResult = { passed: true, results: [] }

    // 300 m of a 1000 m boundary is taken, and BND2 bills both faces of the rest
    const availableLength = {
      availableLength: 1400,
      boundaryLengthMeters: 1000,
      incompatibleLengthMeters: 300,
      feasible: true,
      incompatibleActions: [{ actionCode: 'BND1', billedLengthMeters: 300 }],
      explainedOccupancies: [
        {
          actionCode: 'BND1',
          billedLengthMeters: 300,
          sidedness: BOTH_SIDES,
          occupiedMeters: 300,
          status: 'deducted',
          sharesWith: []
        }
      ],
      targetSidedness: SINGLE_SIDE
    }

    test('should give the available length with the sections explaining it', () => {
      const result = actionResultTransformer({
        action,
        actions,
        availableArea: null,
        availableLength,
        ruleResult
      })

      expect(result.availableLength).toEqual({
        lengthMeters: 1400,
        explanations: expect.arrayContaining([
          { title: expect.any(String), content: expect.any(Array) }
        ])
      })
    })
  })
})

describe('applicationDataTransformer', () => {
  const mockDate = new Date('2023-01-01T00:00:00.000Z')
  const originalDate = Date

  beforeEach(() => {
    global.Date = vi.fn(function () {
      return mockDate
    })
    global.Date.now = originalDate.now
  })

  afterEach(() => {
    global.Date = originalDate
  })

  test('should transform application data when all parcels pass', () => {
    const applicationId = 'APP123'
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
      crn,
      sbi,
      requester,
      landActions,
      parcelResults
    )

    expect(result).toEqual({
      date: mockDate,
      applicationId: 'APP123',
      applicantCrn: crn,
      sbi,
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
      crn,
      sbi,
      requester,
      landActions,
      parcelResults
    )

    expect(result.hasPassed).toBe(false)
  })

  test('should handle empty landActions and parcelResults', () => {
    const applicationId = 'APP123'
    const requester = 'test@example.com'
    const landActions = []
    const parcelResults = []

    const result = applicationDataTransformer(
      applicationId,
      crn,
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
      crn,
      sbi,
      requester,
      landActions,
      parcelResults
    )

    expect(result.hasPassed).toBe(false)
    expect(result.application.parcels).toHaveLength(2)
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
