import { createActionStacks } from './stacks.js'

function makeCompatibilityCheckFn(compatibilityMap) {
  return (action1, action2) => {
    return (
      compatibilityMap[action1]?.includes(action2) ||
      compatibilityMap[action2]?.includes(action1)
    )
  }
}

describe('Stacks', function () {
  const testConditions = [
    [
      'should return no stacks when no actions',
      {
        existingActionsCompatibleByLandCover: [],
        expectedResult: [],
        compatibilityCheckFn: () => true
      }
    ],
    [
      'should return 1 stack when 1 action',
      {
        existingActionsCompatibleByLandCover: [{ code: 'CMOR1', area: 5 }],
        expectedResult: [{ actionCodes: ['CMOR1'], area: 5 }],
        compatibilityCheckFn: () => true
      }
    ],
    [
      'should return 1 stack when 2 actions and area is the same for both actions',
      {
        existingActionsCompatibleByLandCover: [
          { code: 'CMOR1', area: 5 },
          { code: 'UPL1', area: 5 }
        ],
        expectedResult: [{ actionCodes: ['CMOR1', 'UPL1'], area: 5 }],
        compatibilityCheckFn: makeCompatibilityCheckFn({ CMOR1: ['UPL1'] })
      }
    ],
    [
      'should return 2 stack when 2 actions and area for the second action is larger',
      {
        existingActionsCompatibleByLandCover: [
          { code: 'CMOR1', area: 5 },
          { code: 'UPL1', area: 10 }
        ],
        expectedResult: [
          { actionCodes: ['CMOR1', 'UPL1'], area: 5 },
          { actionCodes: ['UPL1'], area: 5 }
        ],
        compatibilityCheckFn: makeCompatibilityCheckFn({ CMOR1: ['UPL1'] })
      }
    ],
    [
      'should return 2 stack when 2 actions and area for the second action is smaller',
      {
        existingActionsCompatibleByLandCover: [
          { code: 'UPL1', area: 9 },
          { code: 'CMOR1', area: 8 }
        ],
        expectedResult: [
          { actionCodes: ['CMOR1', 'UPL1'], area: 8 },
          { actionCodes: ['UPL1'], area: 1 }
        ],
        compatibilityCheckFn: makeCompatibilityCheckFn({ UPL1: ['CMOR1'] })
      }
    ],
    [
      'should return 2 stack when 2 actions and area for the second action is smaller',
      {
        existingActionsCompatibleByLandCover: [
          { code: 'UPL1', area: 9 },
          { code: 'UPL2', area: 8 }
        ],
        expectedResult: [
          { actionCodes: ['UPL2'], area: 8 },
          { actionCodes: ['UPL1'], area: 9 }
        ],
        compatibilityCheckFn: makeCompatibilityCheckFn([])
      }
    ]
  ]

  test.each(testConditions)(
    `%p`,
    (
      name,
      {
        existingActionsCompatibleByLandCover,
        expectedResult,
        compatibilityCheckFn
      }
    ) => {
      expect(
        createActionStacks(
          existingActionsCompatibleByLandCover,
          compatibilityCheckFn
        )
      ).toEqual(expectedResult)
    }
  )
})
