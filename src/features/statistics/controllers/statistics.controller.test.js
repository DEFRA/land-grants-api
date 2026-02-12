import Hapi from '@hapi/hapi'
import { statistics } from '../index.js'
import { getStats } from '../queries/stats.query.js'
import {
  logInfo,
  logBusinessError
} from '~/src/features/common/helpers/logging/log-helpers.js'
import { vi } from 'vitest'

vi.mock('../queries/stats.query.js')
vi.mock('~/src/features/common/helpers/logging/log-helpers.js')

const mockGetStats = getStats
const mockLogInfo = logInfo
const mockLogBusinessError = logBusinessError

describe('Statistics Controller', () => {
  const server = Hapi.server()
  const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }

  const mockPostgresDb = {
    connect: vi.fn()
  }

  beforeAll(async () => {
    server.decorate('request', 'logger', mockLogger)
    server.decorate('server', 'postgresDb', mockPostgresDb)

    await server.register([statistics])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    vi.clearAllMocks()

    mockGetStats.mockResolvedValue(undefined)
    mockLogInfo.mockImplementation(vi.fn())
    mockLogBusinessError.mockImplementation(vi.fn())
  })

  describe('GET /statistics route', () => {
    it('should return 200 when statistics are retrieved successfully', async () => {
      const request = {
        method: 'GET',
        url: '/statistics'
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('Statistics retrieved')

      expect(mockGetStats).toHaveBeenCalledWith(mockLogger, mockPostgresDb)

      expect(mockLogInfo).toHaveBeenCalledWith(mockLogger, {
        category: 'statistics',
        operation: 'statistics_start',
        message: 'Getting statistics'
      })
    })

    it('should return 500 when getStats fails', async () => {
      const mockError = new Error('Database connection failed')
      mockGetStats.mockRejectedValue(mockError)

      const request = {
        method: 'GET',
        url: '/statistics'
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(500)
      expect(message).toBe('An internal server error occurred')

      expect(mockGetStats).toHaveBeenCalledWith(mockLogger, mockPostgresDb)

      expect(mockLogBusinessError).toHaveBeenCalledWith(mockLogger, {
        operation: 'statistics_error',
        error: mockError
      })
    })

    it('should not call logBusinessError on success', async () => {
      const request = {
        method: 'GET',
        url: '/statistics'
      }

      await server.inject(request)

      expect(mockLogBusinessError).not.toHaveBeenCalled()
    })
  })
})
