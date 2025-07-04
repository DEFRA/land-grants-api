import { jest } from '@jest/globals'
import { getCompatibilityMatrix } from '~/src/api/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
import compatibilityMatrixModel from '~/src/api/compatibility-matrix/models/compatibilityMatrix.model.js'

jest.mock('~/src/api/compatibility-matrix/models/compatibilityMatrix.model.js')

describe('getCompatibilityMatrix', () => {
  const mockLogger = {
    error: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should return compatibility matrix for given codes', async () => {
    const mockCodes = ['CMOR1']
    const expectedResults = [
      { optionCode: 'CMOR1', optionCodeCompat: 'HEF5', year: '2024' },
      { optionCode: 'CMOR1', optionCodeCompat: 'UPL1', year: '2024' }
    ]

    compatibilityMatrixModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(expectedResults)
        })
      })
    })

    const result = await getCompatibilityMatrix(mockCodes, mockLogger)

    expect(compatibilityMatrixModel.find).toHaveBeenCalledWith({
      optionCode: { $in: mockCodes }
    })
    expect(result).toEqual(expectedResults)
    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  test('should return empty array when no codes match', async () => {
    const mockCodes = ['NONEXISTENT']
    const expectedResults = []

    compatibilityMatrixModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(expectedResults)
        })
      })
    })

    const result = await getCompatibilityMatrix(mockCodes, mockLogger)

    expect(compatibilityMatrixModel.find).toHaveBeenCalledWith({
      optionCode: { $in: mockCodes }
    })
    expect(result).toEqual(expectedResults)
    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  test('should throw error when database query fails', async () => {
    const mockCodes = ['CMOR1']
    const mockError = new Error('Database error')

    compatibilityMatrixModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockRejectedValue(mockError)
        })
      })
    })

    await expect(getCompatibilityMatrix(mockCodes, mockLogger)).rejects.toThrow(
      mockError
    )
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Unable to get compatibility matrix',
      mockError
    )
  })
})
