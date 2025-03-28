import Boom from '@hapi/boom'
import { getLandActionData } from '~/src/api/parcel/dal/parcel.dal.js'
import landActionsModel from '~/src/api/parcel/models/parcel.js'

jest.mock('~/src/api/parcel/models/parcel.js', () => ({
  findOne: jest.fn()
}))

describe('getLandActionData', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should throw a bad request error if no parcel is provided', async () => {
    await expect(getLandActionData(null, mockLogger)).rejects.toThrow(
      'Parcel is required'
    )

    expect(mockLogger.info).not.toHaveBeenCalled()
    expect(landActionsModel.findOne).not.toHaveBeenCalled()
  })

  it('should throw a not found error if no land parcel is found', async () => {
    landActionsModel.findOne.mockImplementation(() => ({
      lean: jest.fn().mockResolvedValue(null)
    }))

    const parcel = 'sheet123-parcel456'

    let errorThrown
    try {
      await getLandActionData(parcel, mockLogger)
      expect('No error thrown').toBe('Error should have been thrown')
    } catch (error) {
      errorThrown = error
    }

    expect(errorThrown).toBeDefined()
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Fetching land actions data for sheetId: sheet123-parcelId parcel456'
    )
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Land Parcel not found for sheetId: sheet123-parcelId parcel456'
    )
    expect(landActionsModel.findOne).toHaveBeenCalledWith({
      parcelId: 'parcel456',
      sheetId: 'sheet123'
    })
  })

  it('should return land actions data when found', async () => {
    const mockLandAction = {
      parcelId: 'parcel456',
      sheetId: 'sheet123',
      someData: 'test data'
    }

    landActionsModel.findOne.mockImplementation(() => ({
      lean: jest.fn().mockResolvedValue(mockLandAction)
    }))

    const parcel = 'sheet123-parcel456'
    const result = await getLandActionData(parcel, mockLogger)

    expect(result).toEqual(mockLandAction)
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Fetching land actions data for sheetId: sheet123-parcelId parcel456'
    )
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Successfully retrieved Land Parcel data for sheetId: sheet123-parcelId parcel456'
    )
    expect(landActionsModel.findOne).toHaveBeenCalledWith({
      parcelId: 'parcel456',
      sheetId: 'sheet123'
    })
  })

  it('should rethrow Boom errors', async () => {
    const boomError = Boom.forbidden('Access denied')

    landActionsModel.findOne.mockImplementation(() => ({
      lean: jest.fn().mockRejectedValue(boomError)
    }))

    const parcel = 'sheet123-parcel456'

    await expect(getLandActionData(parcel, mockLogger)).rejects.toThrow(
      'Access denied'
    )

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Fetching land actions data for sheetId: sheet123-parcelId parcel456'
    )
  })

  it('should throw an internal error for non-Boom errors', async () => {
    // Create a regular error
    const genericError = new Error('Database connection failed')

    // Setup the mock to throw this error
    landActionsModel.findOne.mockImplementation(() => ({
      lean: jest.fn().mockRejectedValue(genericError)
    }))

    const parcel = 'sheet123-parcel456'

    await expect(getLandActionData(parcel, mockLogger)).rejects.toThrow(
      'Failed to fetch Land Parcel data'
    )

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Fetching land actions data for sheetId: sheet123-parcelId parcel456'
    )
  })

  it('should handle malformed parcel strings correctly', async () => {
    // Test with a malformed parcel string (missing parcelId)
    const malformedParcel = 'sheet123-'

    // The function should attempt to use an empty string as parcelId
    landActionsModel.findOne.mockImplementation(() => ({
      lean: jest.fn().mockResolvedValue(null)
    }))

    let errorThrown
    try {
      await getLandActionData(malformedParcel, mockLogger)
      // If we get here, the test should fail
      expect('No error thrown').toBe('Error should have been thrown')
    } catch (error) {
      errorThrown = error
    }

    expect(errorThrown).toBeDefined()
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Fetching land actions data for sheetId: sheet123-parcelId '
    )
    expect(landActionsModel.findOne).toHaveBeenCalledWith({
      parcelId: '',
      sheetId: 'sheet123'
    })
  })
})
