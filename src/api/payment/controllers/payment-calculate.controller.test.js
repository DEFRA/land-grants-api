import Hapi from '@hapi/hapi'
import { mockLandActions } from '~/src/api/actions/fixtures/index.js'
import { calculatePayment } from '~/src/api/payment/service/payment.service.js'
import { payments } from '~/src/api/payment/index.js'

jest.mock('~/src/api/payment/service/payment.service.js', () => ({
  calculatePayment: jest.fn()
}))

describe('Payment calculate controller', () => {
  const server = Hapi.server()

  beforeAll(async () => {
    server.decorate('request', 'logger', {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn()
    })

    await server.register([payments])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /payments/calculate route', () => {
    test('should return 200 if the request has a valid parcel payload', async () => {
      const request = {
        method: 'POST',
        url: '/payments/calculate',
        payload: mockLandActions
      }

      calculatePayment.mockResolvedValue({
        payment: {
          total: 100.98
        }
      })

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
    })

    test('should return 400 if the request has an invalid parcel payload', async () => {
      const request = {
        method: 'POST',
        url: '/payments/calculate',
        payload: {
          landActions: null
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(message).toBe('Invalid request payload input')
    })

    test('should return 400 if the request has no land actions in payload', async () => {
      const request = {
        method: 'POST',
        url: '/payments/calculate',
        payload: {
          landActions: {
            actions: []
          }
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(message).toBe('Invalid request payload input')
    })

    test('should return 400 if the request has an invalid land action', async () => {
      const request = {
        method: 'POST',
        url: '/payments/calculate',
        payload: mockLandActions
      }

      calculatePayment.mockResolvedValue(null)

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(message).toBe('Unable to calculate payment')
    })

    test('should return 500 if the controller throws an error', async () => {
      const request = {
        method: 'POST',
        url: '/payments/calculate',
        payload: mockLandActions
      }

      calculatePayment.mockRejectedValue(
        new Error('An internal server error occurred')
      )

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(500)
      expect(message).toBe('An internal server error occurred')
    })
  })
})
