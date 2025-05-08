import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import { LandActionsValidateController } from '~/src/api/actions/controllers/actions-validation.controller.js'
import { validateLandActions } from '~/src/api/actions/service/land-actions.service.js'
import { mockLandActions } from '~/src/api/actions/fixtures/index.js'
jest.mock('~/src/api/actions/service/land-actions.service.js')

describe('LandActionsValidateController', () => {
  const mockRequest = {
    payload: mockLandActions,
    logger: {
      info: jest.fn(),
      error: jest.fn()
    }
  }

  const mockResponse = {
    code: jest.fn().mockReturnThis(),
    response: jest.fn().mockReturnThis()
  }

  const mockValidationErrorResponse = {
    errorMessages: ['BND2 is exceeding max limit 100'],
    valid: false
  }

  const mockValidationResponse = {
    message: 'success',
    ...mockValidationErrorResponse
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockResponse.code.mockReturnThis()
    mockResponse.response.mockReturnThis()
  })

  test('should return validation response with errorMessages on successful validation', async () => {
    validateLandActions.mockReturnValue(mockValidationResponse)

    await LandActionsValidateController.handler(mockRequest, mockResponse)
    expect(validateLandActions).toHaveBeenCalled()
    expect(validateLandActions).toHaveBeenCalledWith(
      mockLandActions.landActions,
      mockRequest.logger
    )

    expect(mockResponse.response).toHaveBeenCalledWith({
      message: 'success',
      ...mockValidationResponse
    })

    expect(mockResponse.code).toHaveBeenCalledWith(statusCodes.ok)
  })

  test('should return error response when no data provided in the request, validationActions throws an error', async () => {
    const testError = new Error('landActions is required')
    validateLandActions.mockRejectedValue(testError)

    await LandActionsValidateController.handler(mockRequest, mockResponse)

    expect(mockResponse.response).toHaveBeenCalledWith({
      message: testError.message
    })

    expect(mockResponse.code).toHaveBeenCalledWith(statusCodes.notFound)
  })

  test('should return error response when validationActions throws an error', async () => {
    const testError = new Error('Validation failed')
    validateLandActions.mockImplementation(() => {
      throw testError
    })

    await LandActionsValidateController.handler(mockRequest, mockResponse)

    expect(mockResponse.response).toHaveBeenCalledWith({
      message: testError.message
    })

    expect(mockResponse.code).toHaveBeenCalledWith(statusCodes.notFound)
  })
})
