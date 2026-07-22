import { describe, it, expect, vi, beforeEach } from 'vitest'
import { metricsCounter } from '../../common/helpers/metrics.js'
import { PassThrough } from 'node:stream'

const mockPostMessage = vi.fn()

vi.mock('node:worker_threads', () => ({
  parentPort: {
    postMessage: mockPostMessage
  }
}))

vi.mock('unzipper', () => ({
  default: {
    Parse: vi.fn(() => [])
  }
}))

vi.mock('../../common/s3/s3.js', () => ({
  getFile: vi.fn(),
  failedBucketPath: vi.fn((path) => `failed/${path}`)
}))

vi.mock('../../../config/index.js', () => ({
  config: {
    get: vi.fn(() => 'test-bucket')
  }
}))

vi.mock('../../common/plugins/s3-client.js', () => ({
  createS3Client: vi.fn(() => ({ client: 'mock-s3-client' }))
}))

vi.mock('../service/import-land-data.service.js', () => ({
  importData: vi.fn()
}))

vi.mock('../../common/helpers/logging/logger.js', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn()
  }))
}))

vi.mock('../../common/helpers/logging/log-helpers.js', () => ({
  logInfo: vi.fn(),
  logBusinessError: vi.fn()
}))
vi.mock('../../common/helpers/metrics.js')

vi.mock('../../common/helpers/postgres.js', () => ({
  getDBOptions: vi.fn(() => ({})),
  createDBClient: vi.fn()
}))
vi.mock('../../common/helpers/secure-context/secure-context.js', () => ({
  createSecureContext: vi.fn()
}))
vi.mock('../service/start-ingest.service.js', () => ({
  getEntityNameForIngest: vi.fn()
}))

describe('Ingest Module', () => {
  describe('importLandData', () => {
    let ingestLandData
    let getFile
    let importData
    let logBusinessError
    let createDBClient
    let getEntityNameForIngest

    let unzipper

    beforeEach(async () => {
      vi.clearAllMocks()

      const module = await import('./ingest.module.js')
      const s3Module = await import('../../common/s3/s3.js')
      const importServiceModule =
        await import('../service/import-land-data.service.js')
      const logHelpersModule =
        await import('../../common/helpers/logging/log-helpers.js')
      const postgresModule = await import('../../common/helpers/postgres.js')
      const startIngestModule =
        await import('../service/start-ingest.service.js')
      unzipper = (await import('unzipper')).default

      ingestLandData = module.ingestLandData
      getFile = s3Module.getFile
      importData = importServiceModule.importData
      logBusinessError = logHelpersModule.logBusinessError
      createDBClient = postgresModule.createDBClient
      getEntityNameForIngest = startIngestModule.getEntityNameForIngest

      const mockClient = { end: vi.fn(), connect: vi.fn() }
      createDBClient.mockReturnValue(mockClient)
      getEntityNameForIngest.mockResolvedValue('land_parcels')
    })

    it('should successfully import land data with valid CSV file', async () => {
      const mockWebStream = new ReadableStream({ start: (c) => c.close() })
      const mockResponse = {
        ContentType: 'text/csv',
        ContentLength: 1024,
        Body: {
          transformToWebStream: vi.fn().mockReturnValue(mockWebStream)
        }
      }

      getFile.mockResolvedValue(mockResponse)
      importData.mockResolvedValue(undefined)

      const result = await ingestLandData({
        taskId: 'task-1',
        data: {
          s3key: 'land_parcels/123/test.csv',
          filename: 'test.csv',
          ingestId: '123'
        }
      })

      expect(result).toBeUndefined()
      expect(getFile).toHaveBeenCalledWith(
        { client: 'mock-s3-client' },
        'test-bucket',
        'land_parcels/123/test.csv'
      )
      expect(importData).toHaveBeenCalledWith(
        expect.any(Object),
        { name: 'land_parcels', truncateTable: false, ingest: true },
        '123',
        'test.csv',
        expect.any(Object)
      )

      // entity type resolved via DB lookup using the provided ingestId
      expect(getEntityNameForIngest).toHaveBeenCalledWith(
        '123',
        expect.any(Object)
      )
      expect(createDBClient).toHaveBeenCalledTimes(1)
    })

    it('should throw a clear error when the ingest record or its entity cannot be found', async () => {
      getEntityNameForIngest.mockResolvedValue(undefined)

      const mockResponse = {
        ContentType: 'text/csv',
        Body: { transformToWebStream: vi.fn() }
      }
      getFile.mockResolvedValue(mockResponse)

      await expect(
        ingestLandData({
          taskId: 'task-2',
          data: {
            s3key: 'land_parcels/123/test.csv',
            filename: 'test.csv',
            ingestId: '123'
          }
        })
      ).rejects.toThrow('Ingest 123 not found')

      expect(importData).not.toHaveBeenCalled()
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-2',
          success: false,
          error: 'Ingest 123 not found'
        })
      )
    })

    it('should successfully import land data with ZIP file containing CSV', async () => {
      const mockZipStream = new PassThrough({ objectMode: true })
      const zipEntries = [
        { path: 'ignore.txt', autodrain: vi.fn() },
        { path: 'data.csv' },
        null
      ]
      zipEntries.forEach((entry) => mockZipStream.push(entry))

      unzipper.Parse.mockReturnValue(mockZipStream)

      const mockWebStream = new ReadableStream({ start: (c) => c.close() })
      const mockResponse = {
        ContentType: 'application/zip',
        ContentLength: 4096,
        Body: {
          transformToWebStream: vi.fn().mockReturnValue(mockWebStream)
        }
      }

      getFile.mockResolvedValue(mockResponse)
      importData.mockResolvedValue(undefined)

      const result = await ingestLandData({
        taskId: 'task-3',
        data: {
          s3key: 'land_parcels/123/test.zip'
        }
      })

      expect(result).toBeUndefined()
      expect(unzipper.Parse).toHaveBeenCalledWith({ forceStream: true })
      expect(importData).toHaveBeenCalledWith(
        { path: 'data.csv' },
        { name: 'land_parcels', truncateTable: false, ingest: true },
        '123',
        undefined,
        expect.any(Object)
      )

      // no ingestId provided, so entity type is derived from the s3 key, not the DB
      expect(getEntityNameForIngest).not.toHaveBeenCalled()
      expect(createDBClient).not.toHaveBeenCalled()
    })

    it('should throw error if no CSV is found in the ZIP archive', async () => {
      const mockZipStream = new PassThrough({ objectMode: true })
      const zipEntries = [{ path: 'ignore.txt', autodrain: vi.fn() }, null]
      zipEntries.forEach((entry) => mockZipStream.push(entry))

      unzipper.Parse.mockReturnValue(mockZipStream)

      const mockWebStream = new ReadableStream({ start: (c) => c.close() })
      const mockResponse = {
        ContentType: 'application/zip',
        ContentLength: 4096,
        Body: {
          transformToWebStream: vi.fn().mockReturnValue(mockWebStream)
        }
      }

      getFile.mockResolvedValue(mockResponse)

      await expect(
        ingestLandData({
          taskId: 'task-4',
          data: { s3key: 'land_parcels/123/test.zip' }
        })
      ).rejects.toThrow('No CSV found in the ZIP')

      expect(importData).not.toHaveBeenCalled()
      expect(metricsCounter).toHaveBeenCalledWith('land_data_ingest_failed', 1)
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-4',
          success: false,
          error: 'No CSV found in the ZIP'
        })
      )
    })

    it('should throw error for invalid content type', async () => {
      const mockResponse = {
        ContentType: 'application/json',
        Body: {
          transformToWebStream: vi.fn()
        }
      }

      getFile.mockResolvedValue(mockResponse)

      await expect(
        ingestLandData({
          taskId: 'task-5',
          data: { s3key: 'land_parcels/123/test.json' }
        })
      ).rejects.toThrow('Invalid content type: application/json')

      expect(importData).not.toHaveBeenCalled()
      expect(metricsCounter).toHaveBeenCalledWith('land_data_ingest_failed', 1)
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-5',
          success: false,
          error: 'Invalid content type: application/json'
        })
      )
    })

    it('should handle S3 errors', async () => {
      const s3Error = new Error('S3 connection failed')
      getFile.mockRejectedValue(s3Error)

      await expect(
        ingestLandData({
          taskId: 'task-6',
          data: { s3key: 'land_parcels/123/test.csv' }
        })
      ).rejects.toThrow('S3 connection failed')

      expect(logBusinessError).toHaveBeenCalled()
      expect(metricsCounter).toHaveBeenCalledWith('land_data_ingest_failed', 1)
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-6',
          success: false,
          error: 'S3 connection failed'
        })
      )
    })

    it('should handle invalid resource type in file path', async () => {
      const mockWebStream = new ReadableStream({ start: (c) => c.close() })
      const mockResponse = {
        ContentType: 'text/csv',
        Body: {
          transformToWebStream: vi.fn().mockReturnValue(mockWebStream)
        }
      }

      getFile.mockResolvedValue(mockResponse)

      await expect(
        ingestLandData({
          taskId: 'task-7',
          data: { s3key: 'invalid_resource/123/test.csv' }
        })
      ).rejects.toThrow('Entity type invalid_resource not found')

      expect(logBusinessError).toHaveBeenCalled()
      expect(metricsCounter).toHaveBeenCalledWith('land_data_ingest_failed', 1)
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-7',
          success: false,
          error: 'Entity type invalid_resource not found'
        })
      )
    })
  })
})
