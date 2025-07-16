import { logger } from '../db-tests/testLogger.js'
import { getAvailableAreaForAction } from './availableArea.js'
import { makeCompatibilityCheckFn } from './testUtils.js'

jest.mock(
  '~/src/api/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
)

describe('Available Area', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAvailableAreaForAction', function () {
    const testConditions = [
      [
        'should return full area when no existing actions',
        {
          actionCodeAppliedFor: 'CMOR1',
          sheetId: 'SD6743',
          parcelId: '7268',
          compatibilityCheckFn: makeCompatibilityCheckFn({}),
          existingActions: [],
          availableAreaDataRequirements: {
            landCoverCodesForAppliedForAction: [
              {
                landCoverClassCode: 130,
                landCoverCode: 131
              }
            ],
            landCoversForParcel: [
              {
                landCoverClassCode: 130,
                areaSqm: 10000
              }
            ],
            landCoversForExistingActions: []
          },
          expectedResult: {
            stacks: [],
            explanations: ['No existing actions so no stacks are needed'],
            availableAreaSqm: 10000,
            totalValidLandCoverSqm: 10000,
            availableAreaHectares: 1
          }
        }
      ],
      [
        'should calculate available area with one existing compatible action',
        {
          actionCodeAppliedFor: 'UPL1',
          sheetId: 'SD6743',
          parcelId: '7268',
          compatibilityCheckFn: makeCompatibilityCheckFn({ CMOR1: ['UPL1'] }),
          existingActions: [{ actionCode: 'CMOR1', areaSqm: 1000 }],
          availableAreaDataRequirements: {
            landCoverCodesForAppliedForAction: [
              {
                landCoverClassCode: 130,
                landCoverCode: 131
              }
            ],
            landCoversForParcel: [
              {
                landCoverClassCode: 130,
                areaSqm: 10000
              }
            ],
            landCoversForExistingActions: {
              CMOR1: [
                {
                  landCoverClassCode: 130,
                  landCoverCode: 131
                }
              ]
            }
          },
          expectedResult: {
            stacks: [{ stackNumber: 1, actionCodes: ['CMOR1'], areaSqm: 1000 }],
            explanations: [
              'Adding CMOR1 (area 0.1 ha)',
              '  Created Stack 1 for CMOR1 with area 0.1 ha'
            ],
            availableAreaSqm: 10000,
            totalValidLandCoverSqm: 10000,
            availableAreaHectares: 1
          }
        }
      ],
      [
        'should subtract incompatible stack area from available area',
        {
          actionCodeAppliedFor: 'UPL2',
          sheetId: 'SD6743',
          parcelId: '7268',
          compatibilityCheckFn: makeCompatibilityCheckFn({}),
          existingActions: [{ actionCode: 'UPL1', areaSqm: 2000 }],
          availableAreaDataRequirements: {
            landCoverCodesForAppliedForAction: [
              {
                landCoverClassCode: 130,
                landCoverCode: 131
              }
            ],
            landCoversForParcel: [
              {
                landCoverClassCode: 130,
                areaSqm: 10000
              }
            ],
            landCoversForExistingActions: {
              UPL1: [
                {
                  landCoverClassCode: 130,
                  landCoverCode: 131
                }
              ]
            }
          },
          expectedResult: {
            stacks: [{ stackNumber: 1, actionCodes: ['UPL1'], areaSqm: 2000 }],
            explanations: [
              'Adding UPL1 (area 0.2 ha)',
              '  Created Stack 1 for UPL1 with area 0.2 ha'
            ],
            availableAreaSqm: 8000,
            totalValidLandCoverSqm: 10000,
            availableAreaHectares: 0.8
          }
        }
      ],
      [
        'should handle multiple compatible actions in same stack',
        {
          actionCodeAppliedFor: 'UPL3',
          sheetId: 'SD6743',
          parcelId: '7268',
          compatibilityCheckFn: makeCompatibilityCheckFn({
            CMOR1: ['UPL1', 'UPL3'],
            UPL1: ['UPL3']
          }),
          existingActions: [
            { actionCode: 'CMOR1', areaSqm: 1000 },
            { actionCode: 'UPL1', areaSqm: 1000 }
          ],
          availableAreaDataRequirements: {
            landCoverCodesForAppliedForAction: [
              {
                landCoverClassCode: 130,
                landCoverCode: 131
              }
            ],
            landCoversForParcel: [
              {
                landCoverClassCode: 130,
                areaSqm: 5000
              }
            ],
            landCoversForExistingActions: {
              CMOR1: [
                {
                  landCoverClassCode: 130,
                  landCoverCode: 131
                }
              ],
              UPL1: [
                {
                  landCoverClassCode: 130,
                  landCoverCode: 131
                }
              ]
            }
          },
          expectedResult: {
            stacks: [
              { stackNumber: 1, actionCodes: ['CMOR1', 'UPL1'], areaSqm: 1000 }
            ],
            explanations: [
              'Adding CMOR1 (area 0.1 ha)',
              '  Created Stack 1 for CMOR1 with area 0.1 ha',
              'Adding UPL1 (area 0.1 ha)',
              '  UPL1 is compatible with: CMOR1 in Stack 1',
              '  Added UPL1 to Stack 1 with area 0.1 ha'
            ],
            availableAreaSqm: 5000,
            totalValidLandCoverSqm: 5000,
            availableAreaHectares: 0.5
          }
        }
      ],
      [
        'should handle multiple incompatible actions that are compatible among them in separate stacks',
        {
          actionCodeAppliedFor: 'CMOR1',
          sheetId: 'SD6743',
          parcelId: '7268',
          compatibilityCheckFn: makeCompatibilityCheckFn({
            CHRW1: ['CHRW2', 'CHRW3'],
            CHRW2: ['CHRW3']
          }),
          existingActions: [
            { actionCode: 'CHRW1', areaSqm: 10000 },
            { actionCode: 'CHRW2', areaSqm: 8000 },
            { actionCode: 'CHRW3', areaSqm: 7000 }
          ],
          availableAreaDataRequirements: {
            landCoverCodesForAppliedForAction: [
              {
                landCoverClassCode: 130,
                landCoverCode: 131
              }
            ],
            landCoversForParcel: [
              {
                landCoverClassCode: 130,
                areaSqm: 11150.572
              }
            ],
            landCoversForExistingActions: {
              CHRW1: [
                {
                  landCoverClassCode: 130,
                  landCoverCode: 131
                }
              ],
              CHRW2: [
                {
                  landCoverClassCode: 130,
                  landCoverCode: 131
                }
              ],
              CHRW3: [
                {
                  landCoverClassCode: 130,
                  landCoverCode: 131
                }
              ]
            }
          },
          expectedResult: {
            stacks: [
              {
                stackNumber: 1,
                actionCodes: ['CHRW3', 'CHRW2', 'CHRW1'],
                areaSqm: 7000
              },
              {
                stackNumber: 2,
                actionCodes: ['CHRW2', 'CHRW1'],
                areaSqm: 1000
              },
              {
                stackNumber: 3,
                actionCodes: ['CHRW1'],
                areaSqm: 2000
              }
            ],
            explanations: [
              'Adding CHRW3 (area 0.7 ha)',
              '  Created Stack 1 for CHRW3 with area 0.7 ha',
              'Adding CHRW2 (area 0.8 ha)',
              '  CHRW2 is compatible with: CHRW3 in Stack 1',
              '  Added CHRW2 to Stack 1 with area 0.7 ha',
              '  Created Stack 2 for CHRW2 with area 0.1 ha',
              'Adding CHRW1 (area 1 ha)',
              '  CHRW1 is compatible with: CHRW3, CHRW2 in Stack 1',
              '  Added CHRW1 to Stack 1 with area 0.7 ha',
              '  CHRW1 is compatible with: CHRW2 in Stack 2',
              '  Added CHRW1 to Stack 2 with area 0.1 ha',
              '  Created Stack 3 for CHRW1 with area 0.2 ha'
            ],
            availableAreaSqm: 1150.5720000000001,
            totalValidLandCoverSqm: 11150.572,
            availableAreaHectares: 0.1150572
          }
        }
      ],
      [
        'should handle multiple incompatible actions in separate stacks',
        {
          actionCodeAppliedFor: 'UPL3',
          sheetId: 'SD6743',
          parcelId: '7268',
          compatibilityCheckFn: makeCompatibilityCheckFn({}),
          existingActions: [
            { actionCode: 'UPL1', areaSqm: 1000 },
            { actionCode: 'UPL2', areaSqm: 2000 }
          ],
          availableAreaDataRequirements: {
            landCoverCodesForAppliedForAction: [
              {
                landCoverClassCode: 130,
                landCoverCode: 131
              }
            ],
            landCoversForParcel: [
              {
                landCoverClassCode: 130,
                areaSqm: 10000
              }
            ],
            landCoversForExistingActions: {
              UPL1: [
                {
                  landCoverClassCode: 130,
                  landCoverCode: 131
                }
              ],
              UPL2: [
                {
                  landCoverClassCode: 130,
                  landCoverCode: 131
                }
              ]
            }
          },
          expectedResult: {
            stacks: [
              { stackNumber: 1, actionCodes: ['UPL1'], areaSqm: 1000 },
              { stackNumber: 2, actionCodes: ['UPL2'], areaSqm: 2000 }
            ],
            explanations: [
              'Adding UPL1 (area 0.1 ha)',
              '  Created Stack 1 for UPL1 with area 0.1 ha',
              'Adding UPL2 (area 0.2 ha)',
              '  UPL2 is not compatible with: UPL1 in Stack 1',
              '  Created Stack 2 for UPL2 with area 0.2 ha'
            ],
            availableAreaSqm: 7000,
            totalValidLandCoverSqm: 10000,
            availableAreaHectares: 0.7
          }
        }
      ],
      [
        'should return zero available area when all land is used by incompatible actions',
        {
          actionCodeAppliedFor: 'UPL2',
          sheetId: 'SD6743',
          parcelId: '7268',
          compatibilityCheckFn: makeCompatibilityCheckFn({}),
          existingActions: [{ actionCode: 'UPL1', areaSqm: 5000 }],
          availableAreaDataRequirements: {
            landCoverCodesForAppliedForAction: [
              {
                landCoverClassCode: 130,
                landCoverCode: 131
              }
            ],
            landCoversForParcel: [
              {
                landCoverClassCode: 130,
                areaSqm: 5000
              }
            ],
            landCoversForExistingActions: {
              UPL1: [
                {
                  landCoverClassCode: 130,
                  landCoverCode: 131
                }
              ]
            }
          },
          expectedResult: {
            stacks: [{ stackNumber: 1, actionCodes: ['UPL1'], areaSqm: 5000 }],
            explanations: [
              {
                title: 'Application Information',
                content: [`Action code - UPL2`, `Parcel Id - SD6743 7268`]
              },
              {
                title: 'Land Covers For Parcel',
                content: [`130 - 0.5 ha`]
              },
              {
                title: 'Existing actions',
                content: [`UPL1 - 0.5 ha`]
              },
              {
                title: 'Valid land covers for action: UPL2',
                content: [`130 - 131`]
              },
              {
                title: 'Stacks',
                content: [
                  `Adding UPL1 (area 0.5 ha)`,
                  `  Created Stack 1 for UPL1 with area 0.5 ha`
                ]
              }
            ],
            availableAreaSqm: 0,
            totalValidLandCoverSqm: 5000,
            availableAreaHectares: 0
          }
        }
      ]
    ]

    test.each(testConditions)(
      `%p`,
      (
        name,
        {
          actionCodeAppliedFor,
          sheetId,
          parcelId,
          compatibilityCheckFn,
          existingActions,
          availableAreaDataRequirements,
          expectedResult
        }
      ) => {
        const result = getAvailableAreaForAction(
          actionCodeAppliedFor,
          sheetId,
          parcelId,
          compatibilityCheckFn,
          existingActions,
          availableAreaDataRequirements,
          logger
        )

        expect(JSON.stringify(result, 2)).toEqual(
          JSON.stringify(expectedResult, 2)
        )
      }
    )
  })
})
