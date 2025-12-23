import { vi, describe, test, beforeEach, afterEach, expect } from 'vitest'
import {
  processFile,
  createTaskInfo,
  initiateLandDataUpload
} from './ingest-schedule.service.js'
import * as workerThread from '../../common/worker-thread/start-worker-thread.js'
import { config } from '../../../config/index.js'

vi.mock('../../common/worker-thread/start-worker-thread.js')
vi.mock('../../../config/index.js')

// Mock global fetch
global.fetch = vi.fn()

describe('Ingest Schedule Service', () => {
  let mockRequest
  let mockLogger

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }

    mockRequest = {
      server: {
        s3: {
          send: vi.fn()
        }
      },
      logger: mockLogger
    }

    // Mock startWorker to return a resolved promise
    workerThread.startWorker.mockResolvedValue()

    vi.clearAllMocks()
  })

  describe('processFile', () => {
    const mockFilepath = '/tmp/test-file.csv'
    const mockCategory = 'land_parcels'
    const mockTitle = 'Land Parcels Upload'
    const mockTaskId = 12345

    it('should call startWorker with correct parameters', async () => {
      await processFile(
        mockFilepath,
        mockRequest,
        mockCategory,
        mockTitle,
        mockTaskId
      )

      expect(workerThread.startWorker).toHaveBeenCalledTimes(1)

      const [request, workerPath, title, category, taskId, filepath] =
        workerThread.startWorker.mock.calls[0]

      expect(request).toBe(mockRequest)
      expect(workerPath).toContain('ingest-schedule.worker.js')
      expect(title).toBe(mockTitle)
      expect(category).toBe(mockCategory)
      expect(taskId).toBe(mockTaskId)
      expect(filepath).toBe(mockFilepath)
    })

    it('should construct worker path relative to service file location', async () => {
      await processFile(
        mockFilepath,
        mockRequest,
        mockCategory,
        mockTitle,
        mockTaskId
      )

      const workerPath = workerThread.startWorker.mock.calls[0][1]
      expect(workerPath).toContain('workers/ingest-schedule.worker.js')
      expect(workerPath).toMatch(/ingest-schedule\.worker\.js$/)
    })

    it('should return promise that resolves when worker completes', async () => {
      workerThread.startWorker.mockResolvedValue({ success: true })

      const result = await processFile(
        mockFilepath,
        mockRequest,
        mockCategory,
        mockTitle,
        mockTaskId
      )

      expect(result).toEqual({ success: true })
    })

    it('should propagate worker errors', async () => {
      const workerError = new Error('Worker processing failed')
      workerThread.startWorker.mockRejectedValue(workerError)

      await expect(
        processFile(
          mockFilepath,
          mockRequest,
          mockCategory,
          mockTitle,
          mockTaskId
        )
      ).rejects.toThrow('Worker processing failed')
    })

    it('should handle different file paths', async () => {
      const differentPath = '/var/data/uploads/file.csv'

      await processFile(
        differentPath,
        mockRequest,
        mockCategory,
        mockTitle,
        mockTaskId
      )

      const filepath = workerThread.startWorker.mock.calls[0][5]
      expect(filepath).toBe(differentPath)
    })

    it('should handle different categories', async () => {
      const differentCategory = 'land_covers'

      await processFile(
        mockFilepath,
        mockRequest,
        differentCategory,
        mockTitle,
        mockTaskId
      )

      const category = workerThread.startWorker.mock.calls[0][3]
      expect(category).toBe(differentCategory)
    })

    it('should handle different task IDs', async () => {
      const differentTaskId = 99999

      await processFile(
        mockFilepath,
        mockRequest,
        mockCategory,
        mockTitle,
        differentTaskId
      )

      const taskId = workerThread.startWorker.mock.calls[0][4]
      expect(taskId).toBe(differentTaskId)
    })

    it('should handle different titles', async () => {
      const differentTitle = 'Land Covers Processing'

      await processFile(
        mockFilepath,
        mockRequest,
        mockCategory,
        differentTitle,
        mockTaskId
      )

      const title = workerThread.startWorker.mock.calls[0][2]
      expect(title).toBe(differentTitle)
    })

    it('should handle different request objects', async () => {
      const differentRequest = {
        server: { s3: { send: vi.fn() } },
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }

      await processFile(
        mockFilepath,
        differentRequest,
        mockCategory,
        mockTitle,
        mockTaskId
      )

      const request = workerThread.startWorker.mock.calls[0][0]
      expect(request).toBe(differentRequest)
    })

    it('should handle worker timeout errors', async () => {
      const timeoutError = new Error('Worker timeout')
      workerThread.startWorker.mockRejectedValue(timeoutError)

      await expect(
        processFile(
          mockFilepath,
          mockRequest,
          mockCategory,
          mockTitle,
          mockTaskId
        )
      ).rejects.toThrow('Worker timeout')
    })

    it('should handle worker validation errors', async () => {
      const validationError = new Error('Invalid file format')
      workerThread.startWorker.mockRejectedValue(validationError)

      await expect(
        processFile(
          mockFilepath,
          mockRequest,
          mockCategory,
          mockTitle,
          mockTaskId
        )
      ).rejects.toThrow('Invalid file format')
    })

    it('should call startWorker only once per invocation', async () => {
      await processFile(
        mockFilepath,
        mockRequest,
        mockCategory,
        mockTitle,
        mockTaskId
      )

      expect(workerThread.startWorker).toHaveBeenCalledTimes(1)
    })

    it('should await startWorker completion', async () => {
      let workerCompleted = false
      workerThread.startWorker.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        workerCompleted = true
      })

      await processFile(
        mockFilepath,
        mockRequest,
        mockCategory,
        mockTitle,
        mockTaskId
      )

      expect(workerCompleted).toBe(true)
    })
  })

  describe('Create Task Info', () => {
    beforeEach(() => {
      config.get.mockReturnValue('test-bucket-name')
    })

    it('should capitalize first letter and replace underscores with spaces', () => {
      const result = createTaskInfo(123, 'data_ingestion_task')

      expect(result.title).toBe('Data ingestion task')
      expect(result.category).toBe('data_ingestion_task')
      expect(result.taskId).toBe(123)
      expect(result.bucket).toBe('test-bucket-name')
    })
  })

  describe('Initiate Land Data Upload', () => {
    const mockEndpoint = 'https://cdp-uploader.example.com/initiate'
    const mockCallback = 'https://api.example.com/callback'
    const mockS3Bucket = 'land-grants-bucket'
    const mockS3Path = 'parcels'
    const mockMetadata = {
      reference: 'REF-123456',
      customerId: 'CUST-789',
      resource: 'parcels'
    }

    beforeEach(() => {
      global.fetch.mockClear()
    })

    describe('successful upload initiation', () => {
      it('should make POST request to CDP uploader endpoint', async () => {
        const mockResponse = {
          uploadUrl: '/upload/abc123',
          sessionId: 'session-123'
        }

        global.fetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(mockResponse)
        })

        await initiateLandDataUpload(
          mockEndpoint,
          mockCallback,
          mockS3Bucket,
          mockS3Path,
          mockMetadata
        )

        expect(global.fetch).toHaveBeenCalledWith(mockEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            redirect: '/health',
            callback: mockCallback,
            s3Bucket: mockS3Bucket,
            s3Path: mockS3Path,
            metadata: mockMetadata
          })
        })
      })

      it('should return parsed JSON response from CDP uploader', async () => {
        const mockResponse = {
          uploadUrl: '/upload/xyz789',
          sessionId: 'session-456'
        }

        global.fetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(mockResponse)
        })

        const result = await initiateLandDataUpload(
          mockEndpoint,
          mockCallback,
          mockS3Bucket,
          mockS3Path,
          mockMetadata
        )

        expect(result).toEqual(mockResponse)
      })

      it('should handle response with additional fields', async () => {
        const mockResponse = {
          uploadUrl: '/upload/abc123',
          sessionId: 'session-123',
          expiresAt: '2025-10-28T15:00:00Z',
          maxFileSize: 1048576
        }

        global.fetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(mockResponse)
        })

        const result = await initiateLandDataUpload(
          mockEndpoint,
          mockCallback,
          mockS3Bucket,
          mockS3Path,
          mockMetadata
        )

        expect(result).toEqual(mockResponse)
        expect(result.expiresAt).toBe('2025-10-28T15:00:00Z')
        expect(result.maxFileSize).toBe(1048576)
      })

      it('should include correct redirect path in request', async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({ uploadUrl: '/upload/test' })
        })

        await initiateLandDataUpload(
          mockEndpoint,
          mockCallback,
          mockS3Bucket,
          mockS3Path,
          mockMetadata
        )

        const callArgs = global.fetch.mock.calls[0][1]
        const requestBody = JSON.parse(callArgs.body)

        expect(requestBody.redirect).toBe('/health')
      })
    })

    describe('request parameters', () => {
      it('should handle different metadata types', async () => {
        const metadata = {
          reference: 'REF-654321',
          customerId: 'CUST-999',
          resource: 'covers'
        }

        global.fetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({ uploadUrl: '/upload/test' })
        })

        await initiateLandDataUpload(
          mockEndpoint,
          mockCallback,
          mockS3Bucket,
          'covers',
          metadata
        )

        const callArgs = global.fetch.mock.calls[0][1]
        const requestBody = JSON.parse(callArgs.body)

        expect(requestBody.metadata).toEqual(metadata)
        expect(requestBody.s3Path).toBe('covers')
      })

      it('should handle different S3 bucket names', async () => {
        const differentBucket = 'different-bucket-name'

        global.fetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({ uploadUrl: '/upload/test' })
        })

        await initiateLandDataUpload(
          mockEndpoint,
          mockCallback,
          differentBucket,
          mockS3Path,
          mockMetadata
        )

        const callArgs = global.fetch.mock.calls[0][1]
        const requestBody = JSON.parse(callArgs.body)

        expect(requestBody.s3Bucket).toBe(differentBucket)
      })

      it('should handle different callback URLs', async () => {
        const differentCallback = 'https://different-callback.com/webhook'

        global.fetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({ uploadUrl: '/upload/test' })
        })

        await initiateLandDataUpload(
          mockEndpoint,
          differentCallback,
          mockS3Bucket,
          mockS3Path,
          mockMetadata
        )

        const callArgs = global.fetch.mock.calls[0][1]
        const requestBody = JSON.parse(callArgs.body)

        expect(requestBody.callback).toBe(differentCallback)
      })

      it('should set correct Content-Type header', async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({ uploadUrl: '/upload/test' })
        })

        await initiateLandDataUpload(
          mockEndpoint,
          mockCallback,
          mockS3Bucket,
          mockS3Path,
          mockMetadata
        )

        const callArgs = global.fetch.mock.calls[0][1]
        expect(callArgs.headers['Content-Type']).toBe('application/json')
      })

      it('should handle resource type - covers', async () => {
        const metadata = {
          reference: 'REF-111111',
          customerId: 'CUST-111',
          resource: 'covers'
        }

        global.fetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({ uploadUrl: '/upload/test' })
        })

        await initiateLandDataUpload(
          mockEndpoint,
          mockCallback,
          mockS3Bucket,
          'covers',
          metadata
        )

        const callArgs = global.fetch.mock.calls[0][1]
        const requestBody = JSON.parse(callArgs.body)

        expect(requestBody.s3Path).toBe('covers')
        expect(requestBody.metadata.resource).toBe('covers')
      })

      it('should handle resource type - moorland', async () => {
        const metadata = {
          reference: 'REF-222222',
          customerId: 'CUST-222',
          resource: 'moorland'
        }

        global.fetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({ uploadUrl: '/upload/test' })
        })

        await initiateLandDataUpload(
          mockEndpoint,
          mockCallback,
          mockS3Bucket,
          'moorland',
          metadata
        )

        const callArgs = global.fetch.mock.calls[0][1]
        const requestBody = JSON.parse(callArgs.body)

        expect(requestBody.s3Path).toBe('moorland')
        expect(requestBody.metadata.resource).toBe('moorland')
      })
    })

    describe('error handling', () => {
      it('should throw error when fetch fails', async () => {
        const fetchError = new Error('Network error')
        global.fetch.mockRejectedValue(fetchError)

        await expect(
          initiateLandDataUpload(
            mockEndpoint,
            mockCallback,
            mockS3Bucket,
            mockS3Path,
            mockMetadata
          )
        ).rejects.toThrow('Network error')
      })

      it('should throw error when JSON parsing fails', async () => {
        const jsonError = new Error('Invalid JSON')
        global.fetch.mockResolvedValue({
          json: vi.fn().mockRejectedValue(jsonError)
        })

        await expect(
          initiateLandDataUpload(
            mockEndpoint,
            mockCallback,
            mockS3Bucket,
            mockS3Path,
            mockMetadata
          )
        ).rejects.toThrow('Invalid JSON')
      })

      it('should handle timeout errors', async () => {
        const timeoutError = new Error('Request timeout')
        global.fetch.mockRejectedValue(timeoutError)

        await expect(
          initiateLandDataUpload(
            mockEndpoint,
            mockCallback,
            mockS3Bucket,
            mockS3Path,
            mockMetadata
          )
        ).rejects.toThrow('Request timeout')
      })

      it('should handle connection refused errors', async () => {
        const connectionError = new Error('Connection refused')
        global.fetch.mockRejectedValue(connectionError)

        await expect(
          initiateLandDataUpload(
            mockEndpoint,
            mockCallback,
            mockS3Bucket,
            mockS3Path,
            mockMetadata
          )
        ).rejects.toThrow('Connection refused')
      })
    })

    describe('response handling', () => {
      it('should handle empty response object', async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({})
        })

        const result = await initiateLandDataUpload(
          mockEndpoint,
          mockCallback,
          mockS3Bucket,
          mockS3Path,
          mockMetadata
        )

        expect(result).toEqual({})
      })

      it('should handle null values in response', async () => {
        const mockResponse = {
          uploadUrl: '/upload/test',
          sessionId: null
        }

        global.fetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(mockResponse)
        })

        const result = await initiateLandDataUpload(
          mockEndpoint,
          mockCallback,
          mockS3Bucket,
          mockS3Path,
          mockMetadata
        )

        expect(result.uploadUrl).toBe('/upload/test')
        expect(result.sessionId).toBeNull()
      })

      it('should preserve all response fields', async () => {
        const mockResponse = {
          uploadUrl: '/upload/test',
          sessionId: 'session-123',
          customField1: 'value1',
          customField2: 42,
          customField3: true
        }

        global.fetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(mockResponse)
        })

        const result = await initiateLandDataUpload(
          mockEndpoint,
          mockCallback,
          mockS3Bucket,
          mockS3Path,
          mockMetadata
        )

        expect(result).toEqual(mockResponse)
      })
    })
  })
})
