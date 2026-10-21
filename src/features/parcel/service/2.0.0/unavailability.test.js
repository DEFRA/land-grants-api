import {
  EXISTING_ACTIONS_DO_NOT_FIT,
  EXISTING_ACTIONS_DO_NOT_FIT_ON_LENGTH_REASON,
  EXISTING_ACTIONS_DO_NOT_FIT_REASON,
  INSUFFICIENT_LENGTH_REMAINING,
  NO_AVAILABILITY,
  PARCEL_TOO_SHORT_FOR_ACTION,
  RULE_FAILED
} from '~/src/features/parcel/constants/unavailable-reasons.js'
import {
  areaUnavailableReason,
  exceedsBoundaryReason,
  minimumLengthReason,
  ruleFailedReason
} from './unavailability.js'

describe('areaUnavailableReason', () => {
  test('should name the existing actions with their areas in hectares', () => {
    const result = areaUnavailableReason({
      context: {
        existingActions: [
          { actionCode: 'CMOR1', areaSqm: 12345 },
          { actionCode: 'UPL1', areaSqm: 5000 }
        ]
      }
    })

    expect(result).toEqual({
      code: EXISTING_ACTIONS_DO_NOT_FIT,
      reason: EXISTING_ACTIONS_DO_NOT_FIT_REASON,
      metadata: {
        existingActions: [
          { actionCode: 'CMOR1', areaHa: 1.2345 },
          { actionCode: 'UPL1', areaHa: 0.5 }
        ]
      }
    })
  })

  test('should not pass through other fields of the existing actions', () => {
    const result = areaUnavailableReason({
      context: {
        existingActions: [
          { actionCode: 'CMOR1', areaSqm: 10000, startDate: '2025-01-01' }
        ]
      }
    })

    expect(result.metadata.existingActions).toEqual([
      { actionCode: 'CMOR1', areaHa: 1 }
    ])
  })

  test('should return no existing actions when the result has no context', () => {
    const result = areaUnavailableReason({})

    expect(result.metadata.existingActions).toEqual([])
  })

  test('should return no existing actions when the context has none', () => {
    const result = areaUnavailableReason({ context: {} })

    expect(result.metadata.existingActions).toEqual([])
  })
})

describe('exceedsBoundaryReason', () => {
  test('should name the actions claiming the boundary with their billed lengths', () => {
    const result = exceedsBoundaryReason([
      { actionCode: 'BND1', billedLengthMeters: 120, lengthMeters: 130 },
      { actionCode: 'BND2', billedLengthMeters: 80 }
    ])

    expect(result).toEqual({
      code: EXISTING_ACTIONS_DO_NOT_FIT,
      reason: EXISTING_ACTIONS_DO_NOT_FIT_ON_LENGTH_REASON,
      metadata: {
        existingActions: [
          { actionCode: 'BND1', billedLengthMeters: 120 },
          { actionCode: 'BND2', billedLengthMeters: 80 }
        ]
      }
    })
  })

  test('should return no existing actions when there are none', () => {
    expect(exceedsBoundaryReason([]).metadata.existingActions).toEqual([])
  })
})

describe('minimumLengthReason', () => {
  const incompatibleActions = [
    { actionCode: 'BND1', billedLengthMeters: 60, lengthMeters: 65 }
  ]

  test('should report the parcel too short when the boundary is under the minimum', () => {
    const result = minimumLengthReason(
      { boundaryLengthMeters: 15, incompatibleActions },
      { reason: 'Boundary is too short', minimumLengthMeters: 20 }
    )

    expect(result).toEqual({
      code: PARCEL_TOO_SHORT_FOR_ACTION,
      reason: 'Boundary is too short',
      metadata: { boundaryLengthMeters: 15, minimumLengthMeters: 20 }
    })
  })

  test('should report insufficient length remaining when the boundary meets the minimum', () => {
    const result = minimumLengthReason(
      { boundaryLengthMeters: 70, incompatibleActions },
      { reason: 'Not enough length left', minimumLengthMeters: 20 }
    )

    expect(result).toEqual({
      code: INSUFFICIENT_LENGTH_REMAINING,
      reason: 'Not enough length left',
      metadata: {
        existingActions: [{ actionCode: 'BND1', billedLengthMeters: 60 }],
        minimumLengthMeters: 20
      }
    })
  })

  test('should treat a boundary exactly at the minimum as long enough', () => {
    const result = minimumLengthReason(
      { boundaryLengthMeters: 20, incompatibleActions },
      { reason: 'Not enough length left', minimumLengthMeters: 20 }
    )

    expect(result.code).toBe(INSUFFICIENT_LENGTH_REMAINING)
  })

  test('should report no availability when the existing actions leave no length at all', () => {
    const result = minimumLengthReason(
      { availableLength: 0, boundaryLengthMeters: 60, incompatibleActions },
      { reason: 'Not enough length left', minimumLengthMeters: 20 }
    )

    expect(result.code).toBe(NO_AVAILABILITY)
  })

  test('should still report the parcel too short when it has no length left', () => {
    const result = minimumLengthReason(
      { availableLength: 0, boundaryLengthMeters: 15, incompatibleActions },
      { reason: 'Boundary is too short', minimumLengthMeters: 20 }
    )

    expect(result.code).toBe(PARCEL_TOO_SHORT_FOR_ACTION)
  })

  test('should report insufficient length remaining when the rule gives no minimum', () => {
    const result = minimumLengthReason(
      { boundaryLengthMeters: 5, incompatibleActions: [] },
      { reason: 'Not enough length left' }
    )

    expect(result).toEqual({
      code: INSUFFICIENT_LENGTH_REMAINING,
      reason: 'Not enough length left',
      metadata: { existingActions: [], minimumLengthMeters: undefined }
    })
  })
})

describe('ruleFailedReason', () => {
  test('should join the reasons of the failed rules and describe them', () => {
    const result = ruleFailedReason({
      passed: false,
      results: [
        {
          name: 'rule-a',
          description: 'Rule A',
          passed: false,
          reason: 'A failed',
          explanations: [{ title: 'A', lines: ['a line'] }]
        },
        {
          name: 'rule-b',
          description: 'Rule B',
          passed: true,
          reason: 'B passed',
          explanations: []
        },
        {
          name: 'rule-c',
          description: 'Rule C',
          passed: false,
          reason: 'C failed',
          explanations: []
        }
      ]
    })

    expect(result).toEqual({
      code: RULE_FAILED,
      reason: 'A failed, C failed',
      metadata: {
        results: [
          {
            name: 'rule-a',
            description: 'Rule A',
            explanations: [{ title: 'A', lines: ['a line'] }]
          },
          { name: 'rule-c', description: 'Rule C', explanations: [] }
        ]
      }
    })
  })

  test('should return undefined when no rules failed', () => {
    const result = ruleFailedReason({
      passed: true,
      results: [
        {
          name: 'rule-a',
          description: 'Rule A',
          passed: true,
          reason: 'A passed',
          explanations: []
        }
      ]
    })

    expect(result).toBeUndefined()
  })
})
