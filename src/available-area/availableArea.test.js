import { createLandCoverCodeToString } from '../api/land-cover-codes/services/createLandCoverCodeToString.js'
import { logger } from '../db-tests/testLogger.js'
import { getAvailableAreaForAction } from './availableArea.js'
import { makeCompatibilityCheckFn } from './testUtils.js'

vi.mock(
  '~/src/api/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
)

const landCoverDefinitions = [
  {
    landCoverCode: 131,
    landCoverClassCode: 130,
    landCoverTypeCode: 100,
    landCoverTypeDescription: 'Arable',
    landCoverClassDescription: 'Arable',
    landCoverDescription: 'Arable'
  }
]

const landCoverToString = createLandCoverCodeToString(landCoverDefinitions)

describe('Available Area', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
                landCoverClassCode: '130',
                landCoverCode: '131'
              }
            ],
            landCoversForParcel: [
              {
                landCoverClassCode: '130',
                areaSqm: 10000
              }
            ],
            landCoversForExistingActions: [],
            landCoverDefinitions,
            landCoverToString
          },
          expectedResult: {
            stacks: [],
            explanations: expect.any(Array),
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
                landCoverClassCode: '130',
                landCoverCode: '131'
              }
            ],
            landCoversForParcel: [
              {
                landCoverClassCode: '130',
                areaSqm: 10000
              }
            ],
            landCoversForExistingActions: {
              CMOR1: [
                {
                  landCoverClassCode: '130',
                  landCoverCode: '131'
                }
              ]
            },
            landCoverDefinitions,
            landCoverToString
          },
          expectedResult: {
            stacks: [{ stackNumber: 1, actionCodes: ['CMOR1'], areaSqm: 1000 }],
            explanations: expect.any(Array),
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
                landCoverClassCode: '130',
                landCoverCode: '131'
              }
            ],
            landCoversForParcel: [
              {
                landCoverClassCode: '130',
                areaSqm: 10000
              }
            ],
            landCoversForExistingActions: {
              UPL1: [
                {
                  landCoverClassCode: '130',
                  landCoverCode: '131'
                }
              ]
            },
            landCoverDefinitions,
            landCoverToString
          },
          expectedResult: {
            stacks: [{ stackNumber: 1, actionCodes: ['UPL1'], areaSqm: 2000 }],
            explanations: expect.any(Array),
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
                landCoverClassCode: '130',
                landCoverCode: '131'
              }
            ],
            landCoversForParcel: [
              {
                landCoverClassCode: '130',
                areaSqm: 5000
              }
            ],
            landCoversForExistingActions: {
              CMOR1: [
                {
                  landCoverClassCode: '130',
                  landCoverCode: '131'
                }
              ],
              UPL1: [
                {
                  landCoverClassCode: '130',
                  landCoverCode: '131'
                }
              ]
            },
            landCoverDefinitions,
            landCoverToString
          },
          expectedResult: {
            stacks: [
              { stackNumber: 1, actionCodes: ['CMOR1', 'UPL1'], areaSqm: 1000 }
            ],
            explanations: expect.any(Array),
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
                landCoverClassCode: '130',
                landCoverCode: '131'
              }
            ],
            landCoversForParcel: [
              {
                landCoverClassCode: '130',
                areaSqm: 11151
              }
            ],
            landCoversForExistingActions: {
              CHRW1: [
                {
                  landCoverClassCode: '130',
                  landCoverCode: '131'
                }
              ],
              CHRW2: [
                {
                  landCoverClassCode: '130',
                  landCoverCode: '131'
                }
              ],
              CHRW3: [
                {
                  landCoverClassCode: '130',
                  landCoverCode: '131'
                }
              ]
            },
            landCoverDefinitions,
            landCoverToString
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
            explanations: expect.any(Array),
            availableAreaSqm: 1151,
            totalValidLandCoverSqm: 11151,
            availableAreaHectares: 0.1151
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
                landCoverClassCode: '130',
                landCoverCode: '131'
              }
            ],
            landCoversForParcel: [
              {
                landCoverClassCode: '130',
                areaSqm: 10000
              }
            ],
            landCoversForExistingActions: {
              UPL1: [
                {
                  landCoverClassCode: '130',
                  landCoverCode: '131'
                }
              ],
              UPL2: [
                {
                  landCoverClassCode: '130',
                  landCoverCode: '131'
                }
              ]
            },
            landCoverDefinitions,
            landCoverToString
          },
          expectedResult: {
            stacks: [
              { stackNumber: 1, actionCodes: ['UPL1'], areaSqm: 1000 },
              { stackNumber: 2, actionCodes: ['UPL2'], areaSqm: 2000 }
            ],
            explanations: expect.any(Array),
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
                landCoverClassCode: '130',
                landCoverCode: '131'
              }
            ],
            landCoversForParcel: [
              {
                landCoverClassCode: '130',
                areaSqm: 5000
              }
            ],
            landCoversForExistingActions: {
              UPL1: [
                {
                  landCoverClassCode: '130',
                  landCoverCode: '131'
                }
              ]
            },
            landCoverDefinitions,
            landCoverToString
          },
          expectedResult: {
            stacks: [{ stackNumber: 1, actionCodes: ['UPL1'], areaSqm: 5000 }],
            explanations: expect.any(Array),
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

        expect(result).toEqual(expectedResult)
        expect(result.explanations).toMatchSnapshot(
          `explanations-${actionCodeAppliedFor}-${sheetId}-${parcelId}`
        )
      }
    )
  })
})
