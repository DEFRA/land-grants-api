import Hapi from '@hapi/hapi'
import { mockLandActions } from '~/src/api/actions/fixtures/index.js'
import { validateLandActions } from '~/src/api/actions/service/land-actions.service.js'
import { landactions } from '~/src/api/actions/index.js'

jest.mock('~/src/api/actions/service/land-actions.service.js', () => ({
  validateLandActions: jest.fn()
}))

describe('Actions validation controller', () => {
  const server = Hapi.server()

  beforeAll(async () => {
    server.decorate('request', 'logger', {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn()
    })

    await server.register([landactions])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /actions/validate route', () => {
    test('should return 200 if the request has a valid parcel payload', async () => {
      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: mockLandActions
      }

      validateLandActions.mockResolvedValue({
        errorMessages: [],
        valid: true
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
        url: '/actions/validate',
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
        url: '/actions/validate',
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

    test('should return 200 if the request has an invalid land action', async () => {
      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: mockLandActions
      }

      const validationResponse = {
        errorMessages: [
          {
            code: 'BND1',
            description: 'Invalid land action'
          }
        ],
        valid: false
      }

      validateLandActions.mockResolvedValue(validationResponse)

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, errorMessages, valid }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(errorMessages).toEqual(validationResponse.errorMessages)
      expect(valid).toBe(validationResponse.valid)
    })

    test('should return 500 if the controller throws an error', async () => {
      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: mockLandActions
      }

      validateLandActions.mockRejectedValue(
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
