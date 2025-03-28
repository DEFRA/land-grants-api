import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import { ParcelController } from '~/src/api/parcel/controllers/parcel.controller.js'
import { getLandActionData } from '~/src/api/parcel/dal/parcel.dal.js'
import { enrichLandActionsData } from '~/src/api/parcel/service/parcel.service.js'

jest.mock('~/src/api/parcel/dal/parcel.dal.js')
jest.mock('~/src/api/parcel/service/parcel.service.js')

describe('ParcelController', () => {
  const mockParcel = 'ABC123'
  const mockRequest = {
    params: { parcel: mockParcel },
    logger: {
      info: jest.fn(),
      error: jest.fn()
    }
  }

  const mockResponse = {
    code: jest.fn().mockReturnThis(),
    response: jest.fn().mockReturnThis()
  }

  const mockLandParcelData = {
    parcelId: mockParcel,
    area: 1000,
    actions: ['action1', 'action2']
  }

  const mockEnrichedData = {
    parcelId: mockParcel,
    area: 1000,
    actions: ['action1', 'action2'],
    availableArea: 800
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockResponse.code.mockReturnThis()
    mockResponse.response.mockReturnThis()
  })

  test('should return enriched land actions data on success', async () => {
    getLandActionData.mockResolvedValue(mockLandParcelData)
    enrichLandActionsData.mockReturnValue(mockEnrichedData)

    await ParcelController.handler(mockRequest, mockResponse)

    expect(getLandActionData).toHaveBeenCalledWith(
      mockParcel,
      mockRequest.logger
    )

    expect(enrichLandActionsData).toHaveBeenCalledWith(mockLandParcelData)

    expect(mockResponse.response).toHaveBeenCalledWith({
      message: 'success',
      ...mockEnrichedData
    })

    expect(mockResponse.code).toHaveBeenCalledWith(statusCodes.ok)
  })

  test('should return error response when getLandActionData throws an error', async () => {
    const testError = new Error('Data not found')
    getLandActionData.mockRejectedValue(testError)

    await ParcelController.handler(mockRequest, mockResponse)

    expect(mockResponse.response).toHaveBeenCalledWith({
      message: testError.message
    })

    expect(mockResponse.code).toHaveBeenCalledWith(statusCodes.notFound)
  })

  test('should return error response when enrichLandActionsData throws an error', async () => {
    const testError = new Error('Enrichment failed')
    getLandActionData.mockResolvedValue(mockLandParcelData)
    enrichLandActionsData.mockImplementation(() => {
      throw testError
    })

    await ParcelController.handler(mockRequest, mockResponse)

    expect(mockResponse.response).toHaveBeenCalledWith({
      message: testError.message
    })

    expect(mockResponse.code).toHaveBeenCalledWith(statusCodes.notFound)
  })
})
