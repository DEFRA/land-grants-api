import Hapi from '@hapi/hapi'
import { payments } from '~/src/features/payment/index.js'
import { getLandData } from '~/src/features/parcel/queries/getLandData.query.js'

vi.mock('~/src/features/parcel/queries/getLandData.query.js')

const mockGetLandData = getLandData

describe('Payment calculate WMP controller', () => {
  const server = Hapi.server()

  beforeAll(async () => {
    server.decorate('request', 'logger', {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    })
    server.decorate('server', 'postgresDb', {
      connect: vi.fn(),
      query: vi.fn()
    })

    await server.register([payments])
    await server.initialize()

    mockGetLandData.mockResolvedValue([])
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should throw 400 as not implemented ', async () => {
    const request = {
      method: 'POST',
      url: '/api/v2/payments/calculate-wmp',
      payload: {
        parcelIds: ['SX067-99238'],
        areaHectares: 1
      }
    }

    /** @type { Hapi.ServerInjectResponse<object> } */
    const {
      statusCode,
      result: { message }
    } = await server.inject(request)

    expect(statusCode).toBe(400)
    expect(message).toBe('Not implemented')
  })
})
