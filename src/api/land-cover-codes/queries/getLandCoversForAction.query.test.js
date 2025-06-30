import { jest } from '@jest/globals'
import { getLandCoversForAction } from '~/src/api/land-cover-codes/queries/getLandCoversForAction.query.js'
import actionLandCoversModel from '~/src/api/land-cover-codes/models/action-land-covers.model.js'
import { mockValidLandCoversForAction } from '~/src/api/land-cover-codes/fixtures/index.js'

jest.mock('~/src/api/land-cover-codes/models/action-land-covers.model.js')

describe('getLandCoverCodesForCodes', () => {
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should return land cover codes when found for landCoverClassCode', async () => {
    const mockActionCode = 'NUM2'
    const actionLandCovers = mockValidLandCoversForAction.find(
      (item) => item.actionCode === mockActionCode
    )

    actionLandCoversModel.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([actionLandCovers])
    })

    const result = await getLandCoversForAction(mockActionCode, mockLogger)

    expect(actionLandCoversModel.find).toHaveBeenCalledWith({
      actionCode: mockActionCode
    })
    expect(mockLogger.error).not.toHaveBeenCalled()
    expect(result).toEqual(actionLandCovers.landCovers)
  })

  test('should warn if no land cover codes found', async () => {
    const mockActionCode = 'NUM2'

    actionLandCoversModel.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([])
    })

    const result = await getLandCoversForAction(mockActionCode, mockLogger)

    expect(actionLandCoversModel.find).toHaveBeenCalledWith({
      actionCode: mockActionCode
    })
    expect(mockLogger.warn).toHaveBeenCalledWith(
      `No land cover codes found for action code: ${mockActionCode}`
    )
    expect(result).toEqual([])
  })

  test('should warn if multiple land cover codes found and return first', async () => {
    const mockActionCode = 'NUM2'
    const actionLandCovers = mockValidLandCoversForAction.find(
      (item) => item.actionCode === mockActionCode
    )

    actionLandCoversModel.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([actionLandCovers, actionLandCovers])
    })
    const result = await getLandCoversForAction(mockActionCode, mockLogger)

    expect(actionLandCoversModel.find).toHaveBeenCalledWith({
      actionCode: mockActionCode
    })
    expect(mockLogger.warn).toHaveBeenCalledWith(
      `Multiple land cover codes found for action code: ${mockActionCode}. Returning the first one.`
    )
    expect(result).toEqual(actionLandCovers.landCovers)
  })

  test('should throw error when database query fails', async () => {
    const mockCodes = ['110']
    const mockError = new Error('Database error')

    actionLandCoversModel.find.mockReturnValue({
      lean: jest.fn().mockRejectedValue(mockError)
    })

    await expect(getLandCoversForAction(mockCodes, mockLogger)).rejects.toThrow(
      mockError
    )
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Unable to get land cover codes',
      mockError
    )
  })
})
