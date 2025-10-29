import { jest } from '@jest/globals'
import {
  fileProcessor,
  createTaskInfo,
  initiateLandDataUpload
} from './ingest-schedule.service.js'
import * as s3 from '../../common/s3/s3.js'
import * as workerThread from '../../common/worker-thread/start-worker-thread.js'
import { config } from '../../../config/index.js'

jest.mock('../../common/s3/s3.js')
jest.mock('../../common/worker-thread/start-worker-thread.js')
jest.mock('../../../config/index.js')

// Mock global fetch
global.fetch = jest.fn()

describe('Ingest Schedule Service', () => {
  let mockRequest
  let mockLogger

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }

    mockRequest = {
      server: {
        s3: {
          send: jest.fn()
        }
      },
      logger: mockLogger
    }

    jest.clearAllMocks()
  })

  describe('File Processor', () => {
    describe('when files exist in bucket', () => {
      it('should process single file and return true', async () => {
        const files = ['file1.txt']
        s3.getFiles.mockResolvedValue(files)

        const result = await fileProcessor(
          mockRequest,
          'data_ingestion',
          'Data Ingestion',
          123,
          'test-bucket'
        )

        expect(s3.getFiles).toHaveBeenCalledWith(
          mockRequest.server.s3,
          'test-bucket'
        )
        expect(workerThread.startWorker).toHaveBeenCalledTimes(1)
        expect(workerThread.startWorker).toHaveBeenCalledWith(
          mockRequest,
          expect.stringContaining('ingest-schedule.worker.js'),
          'Data Ingestion',
          'data_ingestion',
          123,
          'file1.txt'
        )
        expect(result).toBe(true)
      })

      it('should process multiple files and return true', async () => {
        const files = ['file1.txt', 'file2.txt', 'file3.csv']
        s3.getFiles.mockResolvedValue(files)

        const result = await fileProcessor(
          mockRequest,
          'data_ingestion',
          'Data Ingestion',
          456,
          'test-bucket'
        )

        expect(s3.getFiles).toHaveBeenCalledWith(
          mockRequest.server.s3,
          'test-bucket'
        )
        expect(workerThread.startWorker).toHaveBeenCalledTimes(3)
        expect(workerThread.startWorker).toHaveBeenNthCalledWith(
          1,
          mockRequest,
          expect.stringContaining('ingest-schedule.worker.js'),
          'Data Ingestion',
          'data_ingestion',
          456,
          'file1.txt'
        )
        expect(workerThread.startWorker).toHaveBeenNthCalledWith(
          2,
          mockRequest,
          expect.stringContaining('ingest-schedule.worker.js'),
          'Data Ingestion',
          'data_ingestion',
          456,
          'file2.txt'
        )
        expect(workerThread.startWorker).toHaveBeenNthCalledWith(
          3,
          mockRequest,
          expect.stringContaining('ingest-schedule.worker.js'),
          'Data Ingestion',
          'data_ingestion',
          456,
          'file3.csv'
        )
        expect(result).toBe(true)
      })

      it('should handle files with nested paths', async () => {
        const files = ['folder/file1.txt', 'folder/subfolder/file2.json']
        s3.getFiles.mockResolvedValue(files)

        const result = await fileProcessor(
          mockRequest,
          'data_processing',
          'Data Processing',
          789,
          'nested-bucket'
        )

        expect(workerThread.startWorker).toHaveBeenCalledTimes(2)
        expect(workerThread.startWorker).toHaveBeenNthCalledWith(
          1,
          mockRequest,
          expect.stringContaining('ingest-schedule.worker.js'),
          'Data Processing',
          'data_processing',
          789,
          'folder/file1.txt'
        )
        expect(workerThread.startWorker).toHaveBeenNthCalledWith(
          2,
          mockRequest,
          expect.stringContaining('ingest-schedule.worker.js'),
          'Data Processing',
          'data_processing',
          789,
          'folder/subfolder/file2.json'
        )
        expect(result).toBe(true)
      })

      it('should handle files with special characters', async () => {
        const files = ['file with spaces.txt', 'file-with-dashes.txt']
        s3.getFiles.mockResolvedValue(files)

        const result = await fileProcessor(
          mockRequest,
          'special_processing',
          'Special Processing',
          999,
          'special-bucket'
        )

        expect(workerThread.startWorker).toHaveBeenCalledTimes(2)
        expect(workerThread.startWorker).toHaveBeenCalledWith(
          mockRequest,
          expect.stringContaining('ingest-schedule.worker.js'),
          'Special Processing',
          'special_processing',
          999,
          'file with spaces.txt'
        )
        expect(result).toBe(true)
      })

      it('should use correct worker path', async () => {
        const files = ['file1.txt']
        s3.getFiles.mockResolvedValue(files)

        await fileProcessor(
          mockRequest,
          'test_category',
          'Test Category',
          111,
          'test-bucket'
        )

        const workerPath = workerThread.startWorker.mock.calls[0][1]
        expect(workerPath).toContain('workers')
        expect(workerPath).toContain('ingest-schedule.worker.js')
        expect(workerPath).toMatch(/workers\/ingest-schedule\.worker\.js$/)
      })
    })

    describe('when no files exist in bucket', () => {
      it('should return false when bucket is empty', async () => {
        s3.getFiles.mockResolvedValue([])

        const result = await fileProcessor(
          mockRequest,
          'data_ingestion',
          'Data Ingestion',
          123,
          'empty-bucket'
        )

        expect(s3.getFiles).toHaveBeenCalledWith(
          mockRequest.server.s3,
          'empty-bucket'
        )
        expect(workerThread.startWorker).not.toHaveBeenCalled()
        expect(result).toBe(false)
      })

      it('should not start any workers when no files', async () => {
        s3.getFiles.mockResolvedValue([])

        await fileProcessor(
          mockRequest,
          'data_ingestion',
          'Data Ingestion',
          123,
          'empty-bucket'
        )

        expect(workerThread.startWorker).not.toHaveBeenCalled()
      })
    })

    describe('error handling', () => {
      it('should throw error when getFiles fails', async () => {
        const s3Error = new Error('Access Denied')
        s3.getFiles.mockRejectedValue(s3Error)

        await expect(
          fileProcessor(
            mockRequest,
            'data_ingestion',
            'Data Ingestion',
            123,
            'test-bucket'
          )
        ).rejects.toThrow('Access Denied')

        expect(workerThread.startWorker).not.toHaveBeenCalled()
      })

      it('should throw error when bucket does not exist', async () => {
        const bucketError = new Error('NoSuchBucket')
        s3.getFiles.mockRejectedValue(bucketError)

        await expect(
          fileProcessor(
            mockRequest,
            'data_ingestion',
            'Data Ingestion',
            123,
            'non-existent-bucket'
          )
        ).rejects.toThrow('NoSuchBucket')
      })

      it('should throw error when S3 connection fails', async () => {
        const connectionError = new Error('Connection timeout')
        s3.getFiles.mockRejectedValue(connectionError)

        await expect(
          fileProcessor(
            mockRequest,
            'data_ingestion',
            'Data Ingestion',
            123,
            'test-bucket'
          )
        ).rejects.toThrow('Connection timeout')
      })
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
    const mockMetadata = {
      filename: 'parcels.csv',
      type: 'parcels'
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
          json: jest.fn().mockResolvedValue(mockResponse)
        })

        await initiateLandDataUpload(
          mockEndpoint,
          mockCallback,
          mockS3Bucket,
          mockMetadata
        )

        expect(global.fetch).toHaveBeenCalledWith(mockEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            redirect: '/health',
            callback: mockCallback,
            s3Bucket: mockS3Bucket,
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
          json: jest.fn().mockResolvedValue(mockResponse)
        })

        const result = await initiateLandDataUpload(
          mockEndpoint,
          mockCallback,
          mockS3Bucket,
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
          json: jest.fn().mockResolvedValue(mockResponse)
        })

        const result = await initiateLandDataUpload(
          mockEndpoint,
          mockCallback,
          mockS3Bucket,
          mockMetadata
        )

        expect(result).toEqual(mockResponse)
        expect(result.expiresAt).toBe('2025-10-28T15:00:00Z')
        expect(result.maxFileSize).toBe(1048576)
      })

      it('should include correct redirect path in request', async () => {
        global.fetch.mockResolvedValue({
          json: jest.fn().mockResolvedValue({ uploadUrl: '/upload/test' })
        })

        await initiateLandDataUpload(
          mockEndpoint,
          mockCallback,
          mockS3Bucket,
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
          filename: 'covers.csv',
          type: 'covers',
          uploadedBy: 'user@example.com'
        }

        global.fetch.mockResolvedValue({
          json: jest.fn().mockResolvedValue({ uploadUrl: '/upload/test' })
        })

        await initiateLandDataUpload(
          mockEndpoint,
          mockCallback,
          mockS3Bucket,
          metadata
        )

        const callArgs = global.fetch.mock.calls[0][1]
        const requestBody = JSON.parse(callArgs.body)

        expect(requestBody.metadata).toEqual(metadata)
      })

      it('should handle different S3 bucket names', async () => {
        const differentBucket = 'different-bucket-name'

        global.fetch.mockResolvedValue({
          json: jest.fn().mockResolvedValue({ uploadUrl: '/upload/test' })
        })

        await initiateLandDataUpload(
          mockEndpoint,
          mockCallback,
          differentBucket,
          mockMetadata
        )

        const callArgs = global.fetch.mock.calls[0][1]
        const requestBody = JSON.parse(callArgs.body)

        expect(requestBody.s3Bucket).toBe(differentBucket)
      })

      it('should handle different callback URLs', async () => {
        const differentCallback = 'https://different-callback.com/webhook'

        global.fetch.mockResolvedValue({
          json: jest.fn().mockResolvedValue({ uploadUrl: '/upload/test' })
        })

        await initiateLandDataUpload(
          mockEndpoint,
          differentCallback,
          mockS3Bucket,
          mockMetadata
        )

        const callArgs = global.fetch.mock.calls[0][1]
        const requestBody = JSON.parse(callArgs.body)

        expect(requestBody.callback).toBe(differentCallback)
      })

      it('should set correct Content-Type header', async () => {
        global.fetch.mockResolvedValue({
          json: jest.fn().mockResolvedValue({ uploadUrl: '/upload/test' })
        })

        await initiateLandDataUpload(
          mockEndpoint,
          mockCallback,
          mockS3Bucket,
          mockMetadata
        )

        const callArgs = global.fetch.mock.calls[0][1]
        expect(callArgs.headers['Content-Type']).toBe('application/json')
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
            mockMetadata
          )
        ).rejects.toThrow('Network error')
      })

      it('should throw error when JSON parsing fails', async () => {
        const jsonError = new Error('Invalid JSON')
        global.fetch.mockResolvedValue({
          json: jest.fn().mockRejectedValue(jsonError)
        })

        await expect(
          initiateLandDataUpload(
            mockEndpoint,
            mockCallback,
            mockS3Bucket,
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
            mockMetadata
          )
        ).rejects.toThrow('Connection refused')
      })
    })

    describe('response handling', () => {
      it('should handle empty response object', async () => {
        global.fetch.mockResolvedValue({
          json: jest.fn().mockResolvedValue({})
        })

        const result = await initiateLandDataUpload(
          mockEndpoint,
          mockCallback,
          mockS3Bucket,
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
          json: jest.fn().mockResolvedValue(mockResponse)
        })

        const result = await initiateLandDataUpload(
          mockEndpoint,
          mockCallback,
          mockS3Bucket,
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
          json: jest.fn().mockResolvedValue(mockResponse)
        })

        const result = await initiateLandDataUpload(
          mockEndpoint,
          mockCallback,
          mockS3Bucket,
          mockMetadata
        )

        expect(result).toEqual(mockResponse)
      })
    })
  })
})
