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
        expectedResult: {
          explanations: ['No existing actions so no stacks are needed'],
          stacks: []
        },
        compatibilityCheckFn: () => true
      }
    ],
    [
      'should return 1 stack when 1 action',
      {
        existingActionsCompatibleByLandCover: [{ code: 'CMOR1', area: 5 }],
        expectedResult: {
          explanations: [
            'Adding CMOR1 (area 5)',
            '  Created Stack 1 for CMOR1 with area 5'
          ],
          stacks: [{ stackNumber: 1, actionCodes: ['CMOR1'], area: 5 }]
        },
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
        expectedResult: {
          explanations: [
            'Adding CMOR1 (area 5)',
            '  Created Stack 1 for CMOR1 with area 5',
            'Adding UPL1 (area 5)',
            '  UPL1 is compatible with: CMOR1 in Stack 1',
            '  Added UPL1 to Stack 1 with area 5'
          ],
          stacks: [{ stackNumber: 1, actionCodes: ['CMOR1', 'UPL1'], area: 5 }]
        },
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
        expectedResult: {
          explanations: [
            'Adding CMOR1 (area 5)',
            '  Created Stack 1 for CMOR1 with area 5',
            'Adding UPL1 (area 10)',
            '  UPL1 is compatible with: CMOR1 in Stack 1',
            '  Added UPL1 to Stack 1 with area 5',
            '  Created Stack 2 for UPL1 with area 5'
          ],
          stacks: [
            { stackNumber: 1, actionCodes: ['CMOR1', 'UPL1'], area: 5 },
            { stackNumber: 2, actionCodes: ['UPL1'], area: 5 }
          ]
        },
        compatibilityCheckFn: makeCompatibilityCheckFn({ CMOR1: ['UPL1'] })
      }
    ],
    [
      'should return 2 stack when 2 actions and area when the second action is smaller',
      {
        existingActionsCompatibleByLandCover: [
          { code: 'UPL1', area: 9 },
          { code: 'CMOR1', area: 8 }
        ],
        expectedResult: {
          explanations: [
            'Adding CMOR1 (area 8)',
            '  Created Stack 1 for CMOR1 with area 8',
            'Adding UPL1 (area 9)',
            '  UPL1 is compatible with: CMOR1 in Stack 1',
            '  Added UPL1 to Stack 1 with area 8',
            '  Created Stack 2 for UPL1 with area 1'
          ],
          stacks: [
            { stackNumber: 1, actionCodes: ['CMOR1', 'UPL1'], area: 8 },
            { stackNumber: 2, actionCodes: ['UPL1'], area: 1 }
          ]
        },
        compatibilityCheckFn: makeCompatibilityCheckFn({ UPL1: ['CMOR1'] })
      }
    ],
    [
      'should return 2 stack when 2 actions and area when the actions are not compatible',
      {
        existingActionsCompatibleByLandCover: [
          { code: 'UPL1', area: 9 },
          { code: 'UPL2', area: 8 }
        ],
        expectedResult: {
          explanations: [
            'Adding UPL2 (area 8)',
            '  Created Stack 1 for UPL2 with area 8',
            'Adding UPL1 (area 9)',
            '  UPL1 is not compatible with all of: UPL2 in Stack 1',
            '  Created Stack 2 for UPL1 with area 9'
          ],
          stacks: [
            { stackNumber: 1, actionCodes: ['UPL2'], area: 8 },
            { stackNumber: 2, actionCodes: ['UPL1'], area: 9 }
          ]
        },
        compatibilityCheckFn: makeCompatibilityCheckFn([])
      }
    ],
    [
      'should return 3 stacks when no actions are compatible',
      {
        existingActionsCompatibleByLandCover: [
          { code: 'A', area: 3 },
          { code: 'B', area: 9 },
          { code: 'C', area: 8 }
        ],
        expectedResult: {
          explanations: [
            'Adding A (area 3)',
            '  Created Stack 1 for A with area 3',
            'Adding C (area 8)',
            '  C is not compatible with all of: A in Stack 1',
            '  Created Stack 2 for C with area 8',
            'Adding B (area 9)',
            '  B is not compatible with all of: A in Stack 1',
            '  B is not compatible with all of: C in Stack 2',
            '  Created Stack 3 for B with area 9'
          ],
          stacks: [
            { stackNumber: 1, actionCodes: ['A'], area: 3 },
            { stackNumber: 2, actionCodes: ['C'], area: 8 },
            { stackNumber: 3, actionCodes: ['B'], area: 9 }
          ]
        },
        compatibilityCheckFn: makeCompatibilityCheckFn([])
      }
    ],
    [
      'should return 3 stacks when all actions are compatible',
      {
        existingActionsCompatibleByLandCover: [
          { code: 'A', area: 3 },
          { code: 'B', area: 9 },
          { code: 'C', area: 8 }
        ],
        expectedResult: {
          explanations: [
            'Adding A (area 3)',
            '  Created Stack 1 for A with area 3',
            'Adding C (area 8)',
            '  C is compatible with: A in Stack 1',
            '  Added C to Stack 1 with area 3',
            '  Created Stack 2 for C with area 5',
            'Adding B (area 9)',
            '  B is compatible with: A, C in Stack 1',
            '  Added B to Stack 1 with area 3',
            '  B is compatible with: C in Stack 2',
            '  Added B to Stack 2 with area 5',
            '  Created Stack 3 for B with area 1'
          ],
          stacks: [
            { stackNumber: 1, actionCodes: ['A', 'C', 'B'], area: 3 },
            { stackNumber: 2, actionCodes: ['C', 'B'], area: 5 },
            { stackNumber: 3, actionCodes: ['B'], area: 1 }
          ]
        },
        compatibilityCheckFn: makeCompatibilityCheckFn({
          A: ['B', 'C'],
          B: ['A', 'C'],
          C: ['A', 'B']
        })
      }
    ],
    [
      'should return 3 stacks when some actions are compatible',
      {
        existingActionsCompatibleByLandCover: [
          { code: 'A', area: 3 },
          { code: 'B', area: 8 },
          { code: 'C', area: 9 }
        ],
        expectedResult: {
          explanations: [
            'Adding A (area 3)',
            '  Created Stack 1 for A with area 3',
            'Adding B (area 8)',
            '  B is not compatible with all of: A in Stack 1',
            '  Created Stack 2 for B with area 8',
            'Adding C (area 9)',
            '  C is compatible with: A in Stack 1',
            '  Added C to Stack 1 with area 3',
            '  C is compatible with: B in Stack 2',
            '  Remaining area of C is 6, this is less than the area of Stack 2 (8), split needed',
            '  Shrinking Stack 2 area to 6 and adding C to it',
            '  Created Stack 3 for B with area 2'
          ],
          stacks: [
            { stackNumber: 1, actionCodes: ['A', 'C'], area: 3 },
            { stackNumber: 2, actionCodes: ['B', 'C'], area: 6 },
            { stackNumber: 3, actionCodes: ['B'], area: 2 }
          ]
        },
        compatibilityCheckFn: makeCompatibilityCheckFn({
          A: ['C'],
          C: ['B']
        })
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

  test('should return appropriate error when non array is passed for actions', () => {
    expect(() => {
      createActionStacks('not an array', () => true)
    }).toThrow('Actions must be an array')
  })

  test('should return appropriate error when null is passed for actions', () => {
    expect(() => {
      createActionStacks(null, () => true)
    }).toThrow('Actions must be an array')
  })
})
