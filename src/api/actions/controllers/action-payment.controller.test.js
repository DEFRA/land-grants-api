import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import { LandActionsPaymentController } from '~/src/api/actions/controllers/action-payment.controller.js'
import { calculatePayment } from '~/src/api/actions/service/land-actions.service.js'

jest.mock('~/src/api/actions/service/land-actions.service.js')

describe('LandActionsPaymentController', () => {
  const mockLandActions = {
    landActions: [
      {
        sheetId: 'SX0679',
        parcelId: '9238',
        sbi: '123456789',
        actions: [
          {
            code: 'BND1',
            quantity: 99
          },
          {
            code: 'BND2',
            quantity: 200
          }
        ]
      }
    ]
  }
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

  const mockCalculatedPaymentData = {
    message: 'success',
    payment: {
      total: 100.98
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockResponse.code.mockReturnThis()
    mockResponse.response.mockReturnThis()
  })

  test('should return calculated payment amount for given land actions data on success', async () => {
    calculatePayment.mockReturnValue(mockCalculatedPaymentData)

    await LandActionsPaymentController.handler(mockRequest, mockResponse)

    expect(calculatePayment).toHaveBeenCalledWith(
      mockLandActions.landActions,
      mockRequest.logger
    )

    expect(mockResponse.response).toHaveBeenCalledWith({
      message: 'success',
      ...mockCalculatedPaymentData
    })

    expect(mockResponse.code).toHaveBeenCalledWith(statusCodes.ok)
  })

  test('should return error response when calculatePayment throws an error', async () => {
    const testError = new Error('Data not found')
    calculatePayment.mockRejectedValue(testError)

    await LandActionsPaymentController.handler(mockRequest, mockResponse)

    expect(mockResponse.response).toHaveBeenCalledWith({
      message: testError.message
    })

    expect(mockResponse.code).toHaveBeenCalledWith(statusCodes.notFound)
  })
})
