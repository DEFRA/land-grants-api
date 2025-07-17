import { getCompatibilityMatrix } from '~/src/api/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
import {
  calculateAvailableArea,
  createCompatibilityMatrix
} from './calculateAvailableArea.js'
import { makeCompatibilityCheckFn } from './testUtils.js'

jest.mock(
  '~/src/api/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
)

const mockGetCompatibilityMatrix = getCompatibilityMatrix

describe('Available Area', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
  const mockDb = {
    connect: jest.fn(() => ({
      query: jest.fn()
    })),
    release: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createCompatibilityMatrix', () => {
    test('should create compatibility function from database results', async () => {
      const codes = ['CMOR1', 'UPL1', 'UPL2']
      const mockCompatibilityData = [
        { option_code: 'UPL1', option_code_compat: 'CMOR1' },
        { option_code: 'CMOR1', option_code_compat: 'UPL1' },
        { option_code: 'UPL2', option_code_compat: 'CMOR1' }
      ]

      mockGetCompatibilityMatrix.mockResolvedValue(mockCompatibilityData)

      const compatibilityFn = await createCompatibilityMatrix(
        mockLogger,
        mockDb,
        codes
      )

      expect(mockGetCompatibilityMatrix).toHaveBeenCalledWith(
        mockLogger,
        mockDb,
        codes
      )
      expect(typeof compatibilityFn).toBe('function')

      expect(compatibilityFn('CMOR1', 'UPL1')).toBe(true)
      expect(compatibilityFn('UPL1', 'CMOR1')).toBe(true)
      expect(compatibilityFn('CMOR1', 'UPL2')).toBe(true)
      expect(compatibilityFn('UPL1', 'UPL2')).toBe(false)
    })

    test('should create a bidirectional compatibility function', async () => {
      const codes = ['CMOR1', 'UPL1']
      const mockCompatibilityData = [
        { option_code: 'UPL1', option_code_compat: 'CMOR1' }
      ]

      mockGetCompatibilityMatrix.mockResolvedValue(mockCompatibilityData)

      const compatibilityFn = await createCompatibilityMatrix(
        mockLogger,
        mockDb,
        codes
      )

      expect(mockGetCompatibilityMatrix).toHaveBeenCalledWith(
        mockLogger,
        mockDb,
        codes
      )
      expect(typeof compatibilityFn).toBe('function')

      expect(compatibilityFn('CMOR1', 'UPL1')).toBe(true)
      expect(compatibilityFn('UPL1', 'CMOR1')).toBe(true)
    })

    test('should return function that returns false when no compatibility data exists', async () => {
      const codes = ['CMOR1', 'UPL1']
      mockGetCompatibilityMatrix.mockResolvedValue([])

      const compatibilityFn = await createCompatibilityMatrix(mockLogger, codes)

      expect(compatibilityFn('CMOR1', 'UPL1')).toBe(false)
      expect(compatibilityFn('UPL1', 'CMOR1')).toBe(false)
    })

    test('should propagate errors from getCompatibilityMatrix', async () => {
      const codes = ['CMOR1', 'UPL1']
      const error = new Error('Database connection failed')
      mockGetCompatibilityMatrix.mockRejectedValue(error)

      await expect(
        createCompatibilityMatrix(mockLogger, codes)
      ).rejects.toThrow('Database connection failed')
    })
  })

  describe('calculateAvailableArea', function () {
    const testConditions = [
      [
        'should return full area when no existing actions',
        {
          processedActions: [],
          action: { actionCode: 'CMOR1' },
          totalValidLandCoverSqm: 10000,
          compatibilityCheckFn: makeCompatibilityCheckFn({}),
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
          processedActions: [{ actionCode: 'CMOR1', areaSqm: 1000 }],
          action: { actionCode: 'UPL1' },
          totalValidLandCoverSqm: 10000,
          compatibilityCheckFn: makeCompatibilityCheckFn({ CMOR1: ['UPL1'] }),
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
          processedActions: [{ actionCode: 'UPL1', areaSqm: 2000 }],
          action: { actionCode: 'UPL2' },
          totalValidLandCoverSqm: 10000,
          compatibilityCheckFn: makeCompatibilityCheckFn({}),
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
          processedActions: [
            { actionCode: 'CMOR1', areaSqm: 1000 },
            { actionCode: 'UPL1', areaSqm: 1000 }
          ],
          action: { actionCode: 'UPL3' },
          totalValidLandCoverSqm: 5000,
          compatibilityCheckFn: makeCompatibilityCheckFn({
            CMOR1: ['UPL1', 'UPL3'],
            UPL1: ['UPL3']
          }),
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
          processedActions: [
            { actionCode: 'CHRW1', areaSqm: 10000 },
            { actionCode: 'CHRW2', areaSqm: 8000 },
            { actionCode: 'CHRW3', areaSqm: 7000 }
          ],
          action: { actionCode: 'CMOR1' },
          compatibilityCheckFn: makeCompatibilityCheckFn({
            CHRW1: ['CHRW2', 'CHRW3'],
            CHRW2: ['CHRW3']
          }),
          totalValidLandCoverSqm: 11150.572,
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
          processedActions: [
            { actionCode: 'UPL1', areaSqm: 1000 },
            { actionCode: 'UPL2', areaSqm: 2000 }
          ],
          action: { actionCode: 'UPL3' },
          totalValidLandCoverSqm: 10000,
          compatibilityCheckFn: makeCompatibilityCheckFn({}),
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
          processedActions: [{ actionCode: 'UPL1', areaSqm: 5000 }],
          action: { actionCode: 'UPL2' },
          totalValidLandCoverSqm: 5000,
          compatibilityCheckFn: makeCompatibilityCheckFn({}),
          expectedResult: {
            stacks: [{ stackNumber: 1, actionCodes: ['UPL1'], areaSqm: 5000 }],
            explanations: [
              'Adding UPL1 (area 0.5 ha)',
              '  Created Stack 1 for UPL1 with area 0.5 ha'
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
          processedActions,
          action,
          totalValidLandCoverSqm,
          compatibilityCheckFn,
          expectedResult
        }
      ) => {
        const result = calculateAvailableArea(
          processedActions,
          action.actionCode,
          totalValidLandCoverSqm,
          compatibilityCheckFn
        )

        expect(result).toEqual(expectedResult)
      }
    )
  })
})
