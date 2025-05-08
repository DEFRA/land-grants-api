import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import { PaymentsCalculateController } from '~/src/api/payment/controllers/payment-calculate.controller.js'
import { calculatePayment } from '~/src/api/payment/service/payment.service.js'
import { mockLandActions } from '~/src/api/actions/fixtures/index.js'

jest.mock('~/src/api/payment/service/payment.service.js')

describe('PaymentsCalculateController', () => {
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

    await PaymentsCalculateController.handler(mockRequest, mockResponse)

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

    await PaymentsCalculateController.handler(mockRequest, mockResponse)

    expect(mockResponse.response).toHaveBeenCalledWith({
      message: testError.message
    })

    expect(mockResponse.code).toHaveBeenCalledWith(statusCodes.notFound)
  })
})
