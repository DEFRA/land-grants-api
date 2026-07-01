import createTestServer from '~/src/tests/test-server.js'
import { StatusIngestController } from './status-ingest.controller.js'
import {
  getIngestById,
  getLatestEntityStatus
} from '../service/start-ingest.service.js'

vi.mock('../service/start-ingest.service.js')
const mockGetIngestById = getIngestById
const mockGetLatestEntityStatus = getLatestEntityStatus

describe('StatusIngestController', () => {
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
      method: 'GET',
      path: '/ingest/status',
      handler: StatusIngestController.handler,
      options: StatusIngestController.options
    })

    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /ingest/status', () => {
    it('Should return latest ingest status', async () => {
      const ingestResponse = [
        {
          id: 1,
          entity: 'land_parcels',
          status: 'completed',
          start_date: '2022-01-01T00:00:00.000Z',
          completed_date: '2022-01-01T00:00:00.000Z',
          files: [
            {
              id: 1,
              ingest_id: 1,
              filename: 'file1.csv',
              total_rows: 10,
              status: 'completed'
            }
          ]
        },
        {
          id: 2,
          entity: 'land_covers',
          status: 'completed',
          start_date: '2022-01-01T00:00:00.000Z',
          completed_date: '2022-01-01T00:00:00.000Z',
          files: [
            {
              id: 2,
              ingest_id: 2,
              filename: 'file2.csv',
              total_rows: 10,
              status: 'completed'
            }
          ]
        }
      ]
      mockGetLatestEntityStatus.mockResolvedValueOnce(ingestResponse)

      const request = {
        method: 'GET',
        url: '/ingest/status'
      }

      const { statusCode, result } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(result).toEqual(ingestResponse)
    })

    it('Should return ingest status for ingest id', async () => {
      const ingestResponse = {
        id: 1,
        entity: 'land_parcels',
        status: 'completed',
        start_date: '2022-01-01T00:00:00.000Z',
        completed_date: '2022-01-01T00:00:00.000Z',
        files: [
          {
            id: 1,
            ingest_id: 1,
            filename: 'file1.csv',
            total_rows: 10,
            status: 'completed'
          }
        ]
      }
      mockGetIngestById.mockResolvedValueOnce(ingestResponse)

      const request = {
        method: 'GET',
        url: '/ingest/status?ingestId=1'
      }

      const { statusCode, result } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(result).toEqual({
        id: 1,
        entity: 'land_parcels',
        status: 'completed',
        start_date: '2022-01-01T00:00:00.000Z',
        completed_date: '2022-01-01T00:00:00.000Z',
        files: [
          {
            id: 1,
            ingest_id: 1,
            filename: 'file1.csv',
            total_rows: 10,
            status: 'completed'
          }
        ]
      })
    })

    it('Should return file status only when filename provided', async () => {
      const ingestResponse = {
        id: 1,
        entity: 'land_parcels',
        status: 'completed',
        start_date: '2022-01-01T00:00:00.000Z',
        completed_date: '2022-01-01T00:00:00.000Z',
        files: [
          {
            id: 1,
            ingest_id: 1,
            filename: 'file1.csv',
            total_rows: 10,
            status: 'completed'
          }
        ]
      }
      mockGetIngestById.mockResolvedValueOnce(ingestResponse)

      const request = {
        method: 'GET',
        url: '/ingest/status?ingestId=1&filename=file1.csv'
      }

      const { statusCode, result } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(result).toEqual({
        id: 1,
        ingest_id: 1,
        filename: 'file1.csv',
        total_rows: 10,
        status: 'completed'
      })
    })

    it('Should return not found when ingest not found', async () => {
      mockGetIngestById.mockResolvedValueOnce(null)

      const request = {
        method: 'GET',
        url: '/ingest/status?ingestId=1'
      }

      const { statusCode, result } = await server.inject(request)

      expect(statusCode).toBe(404)
      expect(result).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: 'Ingest not found'
      })
    })

    it('Should return not found when ingest file not found', async () => {
      mockGetIngestById.mockResolvedValueOnce({
        id: 1,
        entity: 'land_parcels',
        status: 'completed',
        start_date: '2022-01-01T00:00:00.000Z',
        completed_date: '2022-01-01T00:00:00.000Z',
        files: [
          {
            id: 1,
            ingest_id: 1,
            filename: 'file1.csv',
            total_rows: 10,
            status: 'completed'
          }
        ]
      })

      const request = {
        method: 'GET',
        url: '/ingest/status?ingestId=1&filename=file2.csv'
      }

      const { statusCode, result } = await server.inject(request)

      expect(statusCode).toBe(404)
      expect(result).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: 'Ingest file not found'
      })
    })

    it('Should return server error when error thrown', async () => {
      mockGetIngestById.mockRejectedValueOnce(new Error('Database error'))

      const request = {
        method: 'GET',
        url: '/ingest/status?ingestId=1'
      }

      const { statusCode, result } = await server.inject(request)

      expect(statusCode).toBe(500)
      expect(result).toEqual({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An internal server error occurred'
      })
    })
  })
})
