import {
  createCompatibilityMatrix,
  calculateAvailableArea
} from './calculateAvailableArea.js'
import { getCompatibilityMatrix } from '~/src/api/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
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

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createCompatibilityMatrix', () => {
    test('should create compatibility function from database results', async () => {
      const codes = ['CMOR1', 'UPL1', 'UPL2']
      const mockCompatibilityData = [
        { optionCode: 'UPL1', optionCodeCompat: 'CMOR1' },
        { optionCode: 'CMOR1', optionCodeCompat: 'UPL1' },
        { optionCode: 'UPL2', optionCodeCompat: 'CMOR1' }
      ]

      mockGetCompatibilityMatrix.mockResolvedValue(mockCompatibilityData)

      const compatibilityFn = await createCompatibilityMatrix(codes, mockLogger)

      expect(mockGetCompatibilityMatrix).toHaveBeenCalledWith(codes, mockLogger)
      expect(typeof compatibilityFn).toBe('function')

      expect(compatibilityFn('CMOR1', 'UPL1')).toBe(true)
      expect(compatibilityFn('UPL1', 'CMOR1')).toBe(true)
      expect(compatibilityFn('CMOR1', 'UPL2')).toBe(true)
      expect(compatibilityFn('UPL1', 'UPL2')).toBe(false)
    })

    test('should return function that returns false when no compatibility data exists', async () => {
      const codes = ['CMOR1', 'UPL1']
      mockGetCompatibilityMatrix.mockResolvedValue([])

      const compatibilityFn = await createCompatibilityMatrix(codes, mockLogger)

      expect(compatibilityFn('CMOR1', 'UPL1')).toBe(false)
      expect(compatibilityFn('UPL1', 'CMOR1')).toBe(false)
    })

    test('should propagate errors from getCompatibilityMatrix', async () => {
      const codes = ['CMOR1', 'UPL1']
      const error = new Error('Database connection failed')
      mockGetCompatibilityMatrix.mockRejectedValue(error)

      await expect(
        createCompatibilityMatrix(codes, mockLogger)
      ).rejects.toThrow('Database connection failed')
    })
  })

  describe('calculateAvailableArea', function () {
    const testConditions = [
      [
        'should return full area when no existing actions',
        {
          processedActions: [],
          action: { code: 'CMOR1' },
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
          processedActions: [{ code: 'CMOR1', areaSqm: 1000 }],
          action: { code: 'UPL1' },
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
          processedActions: [{ code: 'UPL1', areaSqm: 2000 }],
          action: { code: 'UPL2' },
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
            { code: 'CMOR1', areaSqm: 1000 },
            { code: 'UPL1', areaSqm: 1000 }
          ],
          action: { code: 'UPL3' },
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
        'should handle multiple incompatible actions in separate stacks',
        {
          processedActions: [
            { code: 'UPL1', areaSqm: 1000 },
            { code: 'UPL2', areaSqm: 2000 }
          ],
          action: { code: 'UPL3' },
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
          processedActions: [{ code: 'UPL1', areaSqm: 5000 }],
          action: { code: 'UPL2' },
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
          action,
          totalValidLandCoverSqm,
          compatibilityCheckFn
        )

        expect(result).toEqual(expectedResult)
      }
    )
  })
})
