import { jest } from '@jest/globals'
import { getLandCoverCodesForCodes } from '~/src/api/land-cover-codes/queries/getLandCoverCodes.query.js'
import landCoverCodesModel from '~/src/api/land-cover-codes/models/land-cover-codes.model.js'
import { mockLandCoverCodes } from '~/src/api/land-cover-codes/fixtures/index.js'

jest.mock('~/src/api/land-cover-codes/models/land-cover-codes.model.js')

describe('getLandCoverCodesForCodes', () => {
  const mockLogger = {
    error: jest.fn()
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
        { landUseClassCode: { $in: mockCodes } }
      ]
    })
    expect(result).toEqual(expectedResults)
    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  test('should return land cover codes when found for landUseClassCode', async () => {
    const mockCodes = ['110']
    const expectedResults = mockLandCoverCodes.filter(
      (code) => code.landUseClassCode === '110'
    )

    landCoverCodesModel.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue(expectedResults)
    })

    const result = await getLandCoverCodesForCodes(mockCodes, mockLogger)

    expect(landCoverCodesModel.find).toHaveBeenCalledWith({
      $or: [
        { landCoverClassCode: { $in: mockCodes } },
        { landUseClassCode: { $in: mockCodes } }
      ]
    })
    expect(result).toEqual(expectedResults)
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
