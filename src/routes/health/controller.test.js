import Hapi from '@hapi/hapi'
import { health } from './index.js'

describe('Health controller', () => {
  const server = Hapi.server()

  beforeAll(async () => {
    server.decorate('request', 'logger', {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn()
    })

    await server.register([health])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    vi.clearAllMocks()
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
