import { subtractIncompatibleStacks } from './subtractIncompatibleStacks.js'

function makeCompatibilityCheckFn(compatibilityMap) {
  return (action1, action2) => {
    return (
      compatibilityMap[action1]?.includes(action2) ||
      compatibilityMap[action2]?.includes(action1)
    )
  }
}

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
        )
      ).toEqual(expectedResult)
    }
  )
})
