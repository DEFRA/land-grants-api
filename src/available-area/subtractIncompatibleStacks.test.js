import { subtractIncompatibleStacks } from './subtractIncompatibleStacks.js'
import { makeCompatibilityCheckFn } from './testUtils.js'

describe('Subtract incompatible stacks', function () {
  const testConditions = [
    [
      'should return zero when no valid land cover',
      {
        actionCodeAppliedFor: 'CSAM1',
        totalValidLandCoverSqm: 0,
        stacks: [],
        expectedResult: 0,
        compatibilityCheckFn: () => true
      }
    ],
    [
      'should return total valid land cover if there are no stacks',
      {
        actionCodeAppliedFor: 'CSAM1',
        totalValidLandCoverSqm: 30,
        stacks: [],
        expectedResult: 30,
        compatibilityCheckFn: () => true
      }
    ],
    [
      'should return 29 sqm when total valid land cover is 30 sqm and we have 1 incompatible stack with 1 sqm',
      {
        actionCodeAppliedFor: 'UPL2',
        totalValidLandCoverSqm: 30,
        stacks: [
          {
            actionCodes: ['UPL1'],
            areaSqm: 1
          }
        ],
        expectedResult: 29,
        compatibilityCheckFn: () => false
      }
    ],
    [
      'should return 5 sqm when total valid land cover is 10 sqm and we have 2 stacks with incompatible actions that are compatible between them',
      {
        actionCodeAppliedFor: 'OFM3',
        totalValidLandCoverSqm: 10,
        stacks: [
          {
            actionCodes: ['SPM4', 'SAM1'],
            areaSqm: 3
          },
          {
            actionCodes: ['SAM1'],
            areaSqm: 2
          }
        ],
        expectedResult: 5,
        compatibilityCheckFn: makeCompatibilityCheckFn({
          SPM4: ['SAM1']
        })
      }
    ],
    [
      'should return 30 sqm when total valid land cover is 30 sqm and we have 1 compatible stack with 1 sqm',
      {
        actionCodeAppliedFor: 'CMOR1',
        totalValidLandCoverSqm: 30,
        stacks: [
          {
            actionCodes: ['UPL1'],
            areaSqm: 1
          }
        ],
        expectedResult: 30,
        compatibilityCheckFn: makeCompatibilityCheckFn({
          CMOR1: ['UPL1']
        })
      }
    ],
    [
      'should return 29 sqm when total valid land cover is 30 sqm and we have 1 incompatible action with 1 sqm and 1 compatible action with 5 sqm',
      {
        actionCodeAppliedFor: 'UPL2',
        totalValidLandCoverSqm: 30,
        stacks: [
          {
            actionCodes: ['UPL1'],
            areaSqm: 1
          },
          {
            actionCodes: ['CMOR1'],
            areaSqm: 5
          }
        ],
        expectedResult: 29,
        compatibilityCheckFn: makeCompatibilityCheckFn({
          CMOR1: ['UPL2']
        })
      }
    ],
    [
      'should return zero when calculation returns a negative number',
      {
        actionCodeAppliedFor: 'UPL2',
        totalValidLandCoverSqm: 30,
        stacks: [
          {
            actionCodes: ['UPL1'],
            areaSqm: 40
          }
        ],
        expectedResult: 0,
        compatibilityCheckFn: makeCompatibilityCheckFn({})
      }
    ]
  ]

  test.each(testConditions)(
    `%p`,
    (
      name,
      {
        actionCodeAppliedFor,
        totalValidLandCoverSqm,
        stacks,
        compatibilityCheckFn,
        expectedResult
      }
    ) => {
      expect(
        subtractIncompatibleStacks(
          actionCodeAppliedFor,
          totalValidLandCoverSqm,
          stacks,
          compatibilityCheckFn
        ).result
      ).toEqual(expectedResult)
    }
  )

  test('should return appropriate error when non array is passed for stacks', () => {
    expect(() => {
      subtractIncompatibleStacks('CMOR1', 30, 'not an array', () => true)
    }).toThrow('Stacks must be an array')
  })

  test("should return appropriate error if action code applied for doesn't have a value", () => {
    expect(() => {
      subtractIncompatibleStacks(null, 30, [], () => true)
    }).toThrow('Action code applied for should have a value')
  })

  test('should return appropriate error if compatibility check function is not a function', () => {
    expect(() => {
      subtractIncompatibleStacks('CMOR1', 30, [], 'not a function')
    }).toThrow('Compatibility check function must be a function')
  })

  test('should return appropriate error if total valid land cover is not a number', () => {
    expect(() => {
      subtractIncompatibleStacks('CMOR1', 'not a number', [], () => true)
    }).toThrow('Total valid land cover must be a number')
  })
})
