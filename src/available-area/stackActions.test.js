import { stackActions } from './stackActions.js'
import { makeCompatibilityCheckFn } from './testUtils.js'

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
        existingActionsCompatibleByLandCover: [
          { actionCode: 'CMOR1', areaSqm: 5 }
        ],
        expectedResult: {
          explanations: [
            'Adding CMOR1 (area 0.0005 ha)',
            '  Created Stack 1 for CMOR1 with area 0.0005 ha'
          ],
          stacks: [{ stackNumber: 1, actionCodes: ['CMOR1'], areaSqm: 5 }]
        },
        compatibilityCheckFn: () => true
      }
    ],
    [
      'should return 1 stack when 2 actions and area is the same for both actions',
      {
        existingActionsCompatibleByLandCover: [
          { actionCode: 'CMOR1', areaSqm: 5 },
          { actionCode: 'UPL1', areaSqm: 5 }
        ],
        expectedResult: {
          explanations: [
            'Adding CMOR1 (area 0.0005 ha)',
            '  Created Stack 1 for CMOR1 with area 0.0005 ha',
            'Adding UPL1 (area 0.0005 ha)',
            '  UPL1 is compatible with: CMOR1 in Stack 1',
            '  Added UPL1 to Stack 1 with area 0.0005 ha'
          ],
          stacks: [
            { stackNumber: 1, actionCodes: ['CMOR1', 'UPL1'], areaSqm: 5 }
          ]
        },
        compatibilityCheckFn: makeCompatibilityCheckFn({ CMOR1: ['UPL1'] })
      }
    ],
    [
      'should return 2 stack when 2 actions and area for the second action is larger',
      {
        existingActionsCompatibleByLandCover: [
          { actionCode: 'CMOR1', areaSqm: 5 },
          { actionCode: 'UPL1', areaSqm: 10 }
        ],
        expectedResult: {
          explanations: [
            'Adding CMOR1 (area 0.0005 ha)',
            '  Created Stack 1 for CMOR1 with area 0.0005 ha',
            'Adding UPL1 (area 0.001 ha)',
            '  UPL1 is compatible with: CMOR1 in Stack 1',
            '  Added UPL1 to Stack 1 with area 0.0005 ha',
            '  Created Stack 2 for UPL1 with area 0.0005 ha'
          ],
          stacks: [
            { stackNumber: 1, actionCodes: ['CMOR1', 'UPL1'], areaSqm: 5 },
            { stackNumber: 2, actionCodes: ['UPL1'], areaSqm: 5 }
          ]
        },
        compatibilityCheckFn: makeCompatibilityCheckFn({ CMOR1: ['UPL1'] })
      }
    ],
    [
      'should return 2 stack when 2 actions and area when the second action is smaller',
      {
        existingActionsCompatibleByLandCover: [
          { actionCode: 'UPL1', areaSqm: 9 },
          { actionCode: 'CMOR1', areaSqm: 8 }
        ],
        expectedResult: {
          explanations: [
            'Adding CMOR1 (area 0.0008 ha)',
            '  Created Stack 1 for CMOR1 with area 0.0008 ha',
            'Adding UPL1 (area 0.0009 ha)',
            '  UPL1 is compatible with: CMOR1 in Stack 1',
            '  Added UPL1 to Stack 1 with area 0.0008 ha',
            '  Created Stack 2 for UPL1 with area 0.0001 ha'
          ],
          stacks: [
            { stackNumber: 1, actionCodes: ['CMOR1', 'UPL1'], areaSqm: 8 },
            { stackNumber: 2, actionCodes: ['UPL1'], areaSqm: 1 }
          ]
        },
        compatibilityCheckFn: makeCompatibilityCheckFn({ UPL1: ['CMOR1'] })
      }
    ],
    [
      'should return 2 stack when 2 actions and area when the actions are not compatible',
      {
        existingActionsCompatibleByLandCover: [
          { actionCode: 'UPL1', areaSqm: 9 },
          { actionCode: 'UPL2', areaSqm: 8 }
        ],
        expectedResult: {
          explanations: [
            'Adding UPL2 (area 0.0008 ha)',
            '  Created Stack 1 for UPL2 with area 0.0008 ha',
            'Adding UPL1 (area 0.0009 ha)',
            '  UPL1 is not compatible with: UPL2 in Stack 1',
            '  Created Stack 2 for UPL1 with area 0.0009 ha'
          ],
          stacks: [
            { stackNumber: 1, actionCodes: ['UPL2'], areaSqm: 8 },
            { stackNumber: 2, actionCodes: ['UPL1'], areaSqm: 9 }
          ]
        },
        compatibilityCheckFn: makeCompatibilityCheckFn([])
      }
    ],
    [
      'should return 3 stacks when no actions are compatible',
      {
        existingActionsCompatibleByLandCover: [
          { actionCode: 'A', areaSqm: 3 },
          { actionCode: 'B', areaSqm: 9 },
          { actionCode: 'C', areaSqm: 8 }
        ],
        expectedResult: {
          explanations: [
            'Adding A (area 0.0003 ha)',
            '  Created Stack 1 for A with area 0.0003 ha',
            'Adding C (area 0.0008 ha)',
            '  C is not compatible with: A in Stack 1',
            '  Created Stack 2 for C with area 0.0008 ha',
            'Adding B (area 0.0009 ha)',
            '  B is not compatible with: A in Stack 1',
            '  B is not compatible with: C in Stack 2',
            '  Created Stack 3 for B with area 0.0009 ha'
          ],
          stacks: [
            { stackNumber: 1, actionCodes: ['A'], areaSqm: 3 },
            { stackNumber: 2, actionCodes: ['C'], areaSqm: 8 },
            { stackNumber: 3, actionCodes: ['B'], areaSqm: 9 }
          ]
        },
        compatibilityCheckFn: makeCompatibilityCheckFn([])
      }
    ],
    [
      'should return 3 stacks when all actions are compatible',
      {
        existingActionsCompatibleByLandCover: [
          { actionCode: 'A', areaSqm: 3 },
          { actionCode: 'B', areaSqm: 9 },
          { actionCode: 'C', areaSqm: 8 }
        ],
        expectedResult: {
          explanations: [
            'Adding A (area 0.0003 ha)',
            '  Created Stack 1 for A with area 0.0003 ha',
            'Adding C (area 0.0008 ha)',
            '  C is compatible with: A in Stack 1',
            '  Added C to Stack 1 with area 0.0003 ha',
            '  Created Stack 2 for C with area 0.0005 ha',
            'Adding B (area 0.0009 ha)',
            '  B is compatible with: A, C in Stack 1',
            '  Added B to Stack 1 with area 0.0003 ha',
            '  B is compatible with: C in Stack 2',
            '  Added B to Stack 2 with area 0.0005 ha',
            '  Created Stack 3 for B with area 0.0001 ha'
          ],
          stacks: [
            { stackNumber: 1, actionCodes: ['A', 'C', 'B'], areaSqm: 3 },
            { stackNumber: 2, actionCodes: ['C', 'B'], areaSqm: 5 },
            { stackNumber: 3, actionCodes: ['B'], areaSqm: 1 }
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
          { actionCode: 'A', areaSqm: 3 },
          { actionCode: 'B', areaSqm: 8 },
          { actionCode: 'C', areaSqm: 9 }
        ],
        expectedResult: {
          explanations: [
            'Adding A (area 0.0003 ha)',
            '  Created Stack 1 for A with area 0.0003 ha',
            'Adding B (area 0.0008 ha)',
            '  B is not compatible with: A in Stack 1',
            '  Created Stack 2 for B with area 0.0008 ha',
            'Adding C (area 0.0009 ha)',
            '  C is compatible with: A in Stack 1',
            '  Added C to Stack 1 with area 0.0003 ha',
            '  C is compatible with: B in Stack 2',
            '  Remaining area of C is 0.0006 ha, this is less than the area of Stack 2 (0.0008 ha), split needed',
            '  Shrinking Stack 2 area to 0.0006 ha and adding C to it',
            '  Created Stack 3 for B with area 0.0002 ha'
          ],
          stacks: [
            { stackNumber: 1, actionCodes: ['A', 'C'], areaSqm: 3 },
            { stackNumber: 2, actionCodes: ['B', 'C'], areaSqm: 6 },
            { stackNumber: 3, actionCodes: ['B'], areaSqm: 2 }
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
          { actionCode: 'SW1', areaSqm: 4600 },
          { actionCode: 'AB1', areaSqm: 5000 },
          { actionCode: 'PRF1', areaSqm: 87218 },
          { actionCode: 'SOH1', areaSqm: 91818 },
          { actionCode: 'CSAM1', areaSqm: 93555 }
        ],
        expectedResult: {
          explanations: [
            'Adding SW1 (area 0.46 ha)',
            '  Created Stack 1 for SW1 with area 0.46 ha',
            'Adding AB1 (area 0.5 ha)',
            '  AB1 is not compatible with: SW1 in Stack 1',
            '  Created Stack 2 for AB1 with area 0.5 ha',
            'Adding PRF1 (area 8.7218 ha)',
            '  PRF1 is not compatible with: SW1 in Stack 1',
            '  PRF1 is compatible with: AB1 in Stack 2',
            '  Added PRF1 to Stack 2 with area 0.5 ha',
            '  Created Stack 3 for PRF1 with area 8.2218 ha',
            'Adding SOH1 (area 9.1818 ha)',
            '  SOH1 is not compatible with: SW1 in Stack 1',
            '  SOH1 is compatible with: AB1, PRF1 in Stack 2',
            '  Added SOH1 to Stack 2 with area 0.5 ha',
            '  SOH1 is compatible with: PRF1 in Stack 3',
            '  Added SOH1 to Stack 3 with area 8.2218 ha',
            '  Created Stack 4 for SOH1 with area 0.46 ha',
            'Adding CSAM1 (area 9.3555 ha)',
            '  CSAM1 is not compatible with: SW1 in Stack 1',
            '  CSAM1 is compatible with: AB1, PRF1, SOH1 in Stack 2',
            '  Added CSAM1 to Stack 2 with area 0.5 ha',
            '  CSAM1 is compatible with: PRF1, SOH1 in Stack 3',
            '  Added CSAM1 to Stack 3 with area 8.2218 ha',
            '  CSAM1 is compatible with: SOH1 in Stack 4',
            '  Added CSAM1 to Stack 4 with area 0.46 ha',
            '  Created Stack 5 for CSAM1 with area 0.1737 ha'
          ],
          stacks: [
            { stackNumber: 1, actionCodes: ['SW1'], areaSqm: 4600 },
            {
              stackNumber: 2,
              actionCodes: ['AB1', 'PRF1', 'SOH1', 'CSAM1'],
              areaSqm: 5000
            },
            {
              stackNumber: 3,
              actionCodes: ['PRF1', 'SOH1', 'CSAM1'],
              areaSqm: 82218
            },
            {
              stackNumber: 4,
              actionCodes: ['SOH1', 'CSAM1'],
              areaSqm: 4600
            },
            {
              stackNumber: 5,
              actionCodes: ['CSAM1'],
              areaSqm: 1737
            }
          ]
        },
        compatibilityCheckFn: makeCompatibilityCheckFn({
          AB1: ['CSAM1', 'PRF1', 'SOH1'],
          CSAM1: ['PRF1', 'SOH1'],
          PRF1: ['SOH1']
        })
      }
    ],
    [
      'UPL2: Multiple compatible and incompatible actions, requiring splitting stacks in the middle of the array of stacks',
      {
        existingActionsCompatibleByLandCover: [
          { actionCode: 'UPL1', areaSqm: 20000 },
          { actionCode: 'UPL3', areaSqm: 20000 },
          { actionCode: 'SP1', areaSqm: 20000 },
          { actionCode: 'WS2', areaSqm: 20000 },
          { actionCode: 'CMOR1', areaSqm: 30000 },
          { actionCode: 'OFM1', areaSqm: 30000 },
          { actionCode: 'OFM2', areaSqm: 30000 },
          { actionCode: 'WS1', areaSqm: 40000 }
        ],
        expectedResult: {
          explanations: [
            'Adding UPL1 (area 2 ha)',
            '  Created Stack 1 for UPL1 with area 2 ha',
            'Adding UPL3 (area 2 ha)',
            '  UPL3 is not compatible with: UPL1 in Stack 1',
            '  Created Stack 2 for UPL3 with area 2 ha',
            'Adding SP1 (area 2 ha)',
            '  SP1 is not compatible with: UPL1 in Stack 1',
            '  SP1 is not compatible with: UPL3 in Stack 2',
            '  Created Stack 3 for SP1 with area 2 ha',
            'Adding WS2 (area 2 ha)',
            '  WS2 is not compatible with: UPL1 in Stack 1',
            '  WS2 is not compatible with: UPL3 in Stack 2',
            '  WS2 is not compatible with: SP1 in Stack 3',
            '  Created Stack 4 for WS2 with area 2 ha',
            'Adding CMOR1 (area 3 ha)',
            '  CMOR1 is compatible with: UPL1 in Stack 1',
            '  Added CMOR1 to Stack 1 with area 2 ha',
            '  CMOR1 is compatible with: UPL3 in Stack 2',
            '  Remaining area of CMOR1 is 1 ha, this is less than the area of Stack 2 (2 ha), split needed',
            '  Shrinking Stack 2 area to 1 ha and adding CMOR1 to it',
            '  Created Stack 5 for UPL3 with area 1 ha',
            '  Shifting Stack 5 position to become 3',
            '  Shifting Stack 3 position to become 4',
            '  Shifting Stack 4 position to become 5',
            'Adding OFM1 (area 3 ha)',
            '  OFM1 is not compatible with: UPL1, CMOR1 in Stack 1',
            '  OFM1 is not compatible with: UPL3, CMOR1 in Stack 2',
            '  OFM1 is not compatible with: UPL3 in Stack 3',
            '  OFM1 is not compatible with: SP1 in Stack 4',
            '  OFM1 is not compatible with: WS2 in Stack 5',
            '  Created Stack 6 for OFM1 with area 3 ha',
            'Adding OFM2 (area 3 ha)',
            '  OFM2 is not compatible with: UPL1, CMOR1 in Stack 1',
            '  OFM2 is not compatible with: UPL3, CMOR1 in Stack 2',
            '  OFM2 is not compatible with: UPL3 in Stack 3',
            '  OFM2 is not compatible with: SP1 in Stack 4',
            '  OFM2 is not compatible with: WS2 in Stack 5',
            '  OFM2 is not compatible with: OFM1 in Stack 6',
            '  Created Stack 7 for OFM2 with area 3 ha',
            'Adding WS1 (area 4 ha)',
            '  WS1 is not compatible with: UPL1, CMOR1 in Stack 1',
            '  WS1 is not compatible with: UPL3, CMOR1 in Stack 2',
            '  WS1 is not compatible with: UPL3 in Stack 3',
            '  WS1 is not compatible with: SP1 in Stack 4',
            '  WS1 is compatible with: WS2 in Stack 5',
            '  Added WS1 to Stack 5 with area 2 ha',
            '  WS1 is not compatible with: OFM1 in Stack 6',
            '  WS1 is not compatible with: OFM2 in Stack 7',
            '  Created Stack 8 for WS1 with area 2 ha'
          ],
          stacks: [
            {
              stackNumber: 1,
              actionCodes: ['UPL1', 'CMOR1'],
              areaSqm: 20000
            },
            {
              stackNumber: 2,
              actionCodes: ['UPL3', 'CMOR1'],
              areaSqm: 10000
            },
            {
              stackNumber: 3,
              actionCodes: ['UPL3'],
              areaSqm: 10000
            },
            {
              stackNumber: 4,
              actionCodes: ['SP1'],
              areaSqm: 20000
            },
            {
              stackNumber: 5,
              actionCodes: ['WS2', 'WS1'],
              areaSqm: 20000
            },
            {
              stackNumber: 6,
              actionCodes: ['OFM1'],
              areaSqm: 30000
            },
            {
              stackNumber: 7,
              actionCodes: ['OFM2'],
              areaSqm: 30000
            },
            {
              stackNumber: 8,
              actionCodes: ['WS1'],
              areaSqm: 20000
            }
          ]
        },
        compatibilityCheckFn: makeCompatibilityCheckFn({
          CMOR1: ['UPL1', 'UPL3'],
          WS1: ['WS2']
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
        stackActions(existingActionsCompatibleByLandCover, compatibilityCheckFn)
      ).toEqual(expectedResult)
    }
  )

  test('should return appropriate error when non array is passed for actions', () => {
    expect(() => {
      stackActions('not an array', () => true)
    }).toThrow('Actions must be an array')
  })

  test('should return appropriate error when null is passed for actions', () => {
    expect(() => {
      stackActions(null, () => true)
    }).toThrow('Actions must be an array')
  })
})
