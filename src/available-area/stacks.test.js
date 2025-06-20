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
            '  UPL1 is not compatible with: UPL2 in Stack 1',
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
            '  C is not compatible with: A in Stack 1',
            '  Created Stack 2 for C with area 8',
            'Adding B (area 9)',
            '  B is not compatible with: A in Stack 1',
            '  B is not compatible with: C in Stack 2',
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
            '  B is not compatible with: A in Stack 1',
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
    ],
    [
      'CIPM4: Real world example',
      {
        existingActionsCompatibleByLandCover: [
          { code: 'SW1', area: 4600 },
          { code: 'AB1', area: 5000 },
          { code: 'PRF1', area: 87218 },
          { code: 'SOH1', area: 91818 },
          { code: 'CSAM1', area: 93555 }
        ],
        expectedResult: {
          explanations: [
            'Adding SW1 (area 4600)',
            '  Created Stack 1 for SW1 with area 4600',
            'Adding AB1 (area 5000)',
            '  AB1 is not compatible with: SW1 in Stack 1',
            '  Created Stack 2 for AB1 with area 5000',
            'Adding PRF1 (area 87218)',
            '  PRF1 is not compatible with: SW1 in Stack 1',
            '  PRF1 is compatible with: AB1 in Stack 2',
            '  Added PRF1 to Stack 2 with area 5000',
            '  Created Stack 3 for PRF1 with area 82218',
            'Adding SOH1 (area 91818)',
            '  SOH1 is not compatible with: SW1 in Stack 1',
            '  SOH1 is compatible with: AB1, PRF1 in Stack 2',
            '  Added SOH1 to Stack 2 with area 5000',
            '  SOH1 is compatible with: PRF1 in Stack 3',
            '  Added SOH1 to Stack 3 with area 82218',
            '  Created Stack 4 for SOH1 with area 4600',
            'Adding CSAM1 (area 93555)',
            '  CSAM1 is not compatible with: SW1 in Stack 1',
            '  CSAM1 is compatible with: AB1, PRF1, SOH1 in Stack 2',
            '  Added CSAM1 to Stack 2 with area 5000',
            '  CSAM1 is compatible with: PRF1, SOH1 in Stack 3',
            '  Added CSAM1 to Stack 3 with area 82218',
            '  CSAM1 is compatible with: SOH1 in Stack 4',
            '  Added CSAM1 to Stack 4 with area 4600',
            '  Created Stack 5 for CSAM1 with area 1737'
          ],
          stacks: [
            { stackNumber: 1, actionCodes: ['SW1'], area: 4600 },
            {
              stackNumber: 2,
              actionCodes: ['AB1', 'PRF1', 'SOH1', 'CSAM1'],
              area: 5000
            },
            {
              stackNumber: 3,
              actionCodes: ['PRF1', 'SOH1', 'CSAM1'],
              area: 82218
            },
            {
              stackNumber: 4,
              actionCodes: ['SOH1', 'CSAM1'],
              area: 4600
            },
            {
              stackNumber: 5,
              actionCodes: ['CSAM1'],
              area: 1737
            }
          ]
        },
        compatibilityCheckFn: makeCompatibilityCheckFn({
          AB1: ['CSAM1', 'PRF1', 'SOH1'],
          CSAM1: ['PRF1', 'SOH1'],
          PRF1: ['SOH1']
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
