import createTestServer from '~/src/tests/test-server.js'
import { StartIngestController } from './start-ingest.controller.js'
import { saveIngestStart } from '../service/start-ingest.service.js'
import { vi } from 'vitest'

vi.mock('../service/start-ingest.service.js')

describe('StartIngestController', () => {
  const server = createTestServer()
  const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }

  beforeAll(async () => {
    server.decorate('request', 'logger', mockLogger)
    server.decorate('server', 'postgresDb', {
      query: vi.fn()
    })

    server.route({
      method: 'POST',
      path: '/ingest/{entity}/start',
      handler: StartIngestController.handler,
      options: StartIngestController.options
    })

    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /ingest/{entity}/start', () => {
    const validPayload = {
      files: [
        { filename: 'test_file_1.csv', row_count: 123 },
        { filename: 'test_file_2.csv', row_count: 456 }
      ]
    }

    test('should return 200 and the ingest_id when validation and saveIngestStart succeed', async () => {
      saveIngestStart.mockResolvedValueOnce(999)

      const request = {
        method: 'POST',
        url: '/ingest/agreements/start',
        payload: validPayload
      }

      const { statusCode, result } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(result).toEqual({ ingest_id: 999 })
      expect(saveIngestStart).toHaveBeenCalledWith(
        validPayload,
        'agreements',
        server.postgresDb,
        mockLogger
      )
    })

    test('should return 400 when entity path param is invalid', async () => {
      const request = {
        method: 'POST',
        url: '/ingest/invalid_entity_type/start',
        payload: validPayload
      }

      const { statusCode } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(saveIngestStart).not.toHaveBeenCalled()
    })

    test('should return 400 when payload is missing required fields', async () => {
      const request = {
        method: 'POST',
        url: '/ingest/agreements/start',
        payload: {}
      }

      const { statusCode } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(saveIngestStart).not.toHaveBeenCalled()
    })

    test('should return 400 when filename in payload is missing', async () => {
      const request = {
        method: 'POST',
        url: '/ingest/agreements/start',
        payload: {
          files: [{ row_count: 123 }]
        }
      }

      const { statusCode } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(saveIngestStart).not.toHaveBeenCalled()
    })

    test('should return 400 when row_count in payload is missing', async () => {
      const request = {
        method: 'POST',
        url: '/ingest/agreements/start',
        payload: {
          files: [{ filename: 'file.csv' }]
        }
      }

      const { statusCode } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(saveIngestStart).not.toHaveBeenCalled()
    })

    test('should return 500 when saveIngestStart throws an error', async () => {
      saveIngestStart.mockRejectedValueOnce(new Error('Database error'))

      const request = {
        method: 'POST',
        url: '/ingest/agreements/start',
        payload: validPayload
      }

      const { statusCode, result } = await server.inject(request)

      expect(statusCode).toBe(500)
      expect(result.message).toBe('An internal server error occurred')
    })
  })
})
