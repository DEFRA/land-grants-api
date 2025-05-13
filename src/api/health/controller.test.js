import Hapi from '@hapi/hapi'
import { health } from '~/src/api/health/index.js'

describe('Health controller', () => {
  const server = Hapi.server()

  beforeAll(async () => {
    server.decorate('request', 'logger', {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn()
    })

    await server.register([health])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /health route', () => {
    test('should return 200', async () => {
      const request = {
        method: 'GET',
        url: '/health'
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
    })
  })
})
