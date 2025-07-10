import { jest } from '@jest/globals'
import { mockLandCoverCodes } from '~/src/api/land-cover-codes/fixtures/index.js'
import landCoverCodesModel from '~/src/api/land-cover-codes/models/land-cover-codes.model.js'
import { getLandCoverCodesForCodes } from '~/src/api/land-cover-codes/queries/getLandCoverCodes.query.js'

jest.mock('~/src/api/land-cover-codes/models/land-cover-codes.model.js')

describe('getLandCoverCodesForCodes', () => {
  const mockLogger = {
    error: jest.fn(),
    info: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should return land cover codes when found for landCoverClassCode', async () => {
    const mockCodes = ['110']
    const expectedResults = mockLandCoverCodes.filter(
      (code) => code.landCoverClassCode === '110'
    )

    landCoverCodesModel.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue(expectedResults)
    })

    const result = await getLandCoverCodesForCodes(mockCodes, mockLogger)

    expect(landCoverCodesModel.find).toHaveBeenCalledWith({
      $or: [
        { landCoverClassCode: { $in: mockCodes } },
        { landCoverCode: { $in: mockCodes } }
      ]
    })
    expect(result).toEqual(
      Array.from(
        new Set(
          result.concat(expectedResults.map((code) => code.landCoverCode))
        )
      )
    )
    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  test('should return land cover codes when found for landCoverCode', async () => {
    const mockCodes = ['110']
    const expectedResults = mockLandCoverCodes.filter(
      (code) => code.landCoverCode === '110'
    )

    landCoverCodesModel.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue(expectedResults)
    })

    const result = await getLandCoverCodesForCodes(mockCodes, mockLogger)

    expect(landCoverCodesModel.find).toHaveBeenCalledWith({
      $or: [
        { landCoverClassCode: { $in: mockCodes } },
        { landCoverCode: { $in: mockCodes } }
      ]
    })
    expect(result).toEqual(
      Array.from(
        new Set(
          result.concat(expectedResults.map((code) => code.landCoverCode))
        )
      )
    )
    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  test('should throw error when database query fails', async () => {
    const mockCodes = ['110']
    const mockError = new Error('Database error')

    landCoverCodesModel.find.mockReturnValue({
      lean: jest.fn().mockRejectedValue(mockError)
    })

    await expect(
      getLandCoverCodesForCodes(mockCodes, mockLogger)
    ).rejects.toThrow(mockError)
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Unable to get land cover codes',
      mockError
    )
  })
})
