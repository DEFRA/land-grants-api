import Hapi from '@hapi/hapi'
import { vi } from 'vitest'
import { CDPUploaderCallbackController } from './cdp-uploader-callback.controller.js'
import { logInfo } from '~/src/features/common/helpers/logging/log-helpers.js'
import {
  moveFile,
  processingBucketPath,
  failedBucketPath
} from '../../common/s3/s3.js'
import { config } from '~/src/config/index.js'
import { createS3Client } from '../../common/plugins/s3-client.js'
import { processFile, createTaskInfo } from '../service/ingest.service.js'
import { isValidIngestFile } from '../service/start-ingest.service.js'

// Mock dependencies
vi.mock('~/src/features/common/helpers/logging/log-helpers.js')
vi.mock('../../common/s3/s3.js')
vi.mock('~/src/config/index.js')
vi.mock('../../common/plugins/s3-client.js')
vi.mock('../service/ingest.service.js', async () => ({
  ...(await vi.importActual('../service/ingest.service.js')),
  processFile: vi.fn(),
  createTaskInfo: vi.fn()
}))
vi.mock('../service/start-ingest.service.js', async () => ({
  ...(await vi.importActual('../service/start-ingest.service.js')),
  isValidIngestFile: vi.fn()
}))

const mockProcessFile = processFile
const mockCreateTaskInfo = createTaskInfo
const mockLogInfo = logInfo
const mockMoveFile = moveFile
const mockProcessingBucketPath = processingBucketPath
const mockFailedBucketPath = failedBucketPath
const mockConfig = config
const mockCreateS3Client = createS3Client

describe('CDPUploaderCallbackController', () => {
  const server = Hapi.server()

  const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }

  const mockS3Client = {
    send: vi.fn()
  }

  const mockBucket = 'land-grants-bucket'
  const mockPostgresDb = {
    query: vi.fn()
  }

  const validPayload = {
    uploadStatus: 'ready',
    numberOfRejectedFiles: 0,
    metadata: {
      customerId: 'CUST-123',
      accountId: 'ACC-456'
    },
    form: {
      file: {
        fileId: 'file-123',
        filename: 'land-data.csv',
        contentType: 'text/csv',
        fileStatus: 'complete',
        contentLength: 1024,
        checksumSha256: 'abc123def456',
        s3Key: 'parcels/land-data.csv',
        s3Bucket: 'land-grants-bucket'
      }
    }
  }

  beforeAll(async () => {
    server.decorate('request', 'logger', mockLogger)
    server.decorate('server', 'postgresDb', mockPostgresDb)
    await server.register([
      {
        plugin: {
          name: 'land-data-ingest',
          register: (server) => {
            server.route({
              method: 'POST',
              path: '/land-data-ingest/callback',
              handler: CDPUploaderCallbackController.handler,
              options: CDPUploaderCallbackController.options
            })
          }
        }
      }
    ])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock implementations
    mockCreateS3Client.mockReturnValue(mockS3Client)
    mockConfig.get.mockImplementation((key) => {
      const configMap = {
        's3.bucket': mockBucket
      }
      return configMap[key]
    })
    mockMoveFile.mockResolvedValue({
      success: true,
      message: 'File moved successfully'
    })
    mockProcessingBucketPath.mockImplementation((key) => `processing/${key}`)
    mockFailedBucketPath.mockImplementation((key) => `failed/${key}`)
    mockProcessFile.mockResolvedValue(undefined)
    // Mock createTaskInfo to return expected values
    mockCreateTaskInfo.mockImplementation((taskId, category) => {
      const title =
        category.charAt(0).toUpperCase() +
        category.slice(1).replaceAll('_', ' ').trim()
      return {
        category,
        title,
        taskId,
        bucket: mockBucket
      }
    })
  })

  describe('POST /land-data-ingest/callback route', () => {
    test('should return 200 with success message when payload is valid', async () => {
      const request = {
        method: 'POST',
        url: '/land-data-ingest/callback',
        payload: validPayload
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('Message received')

      // Verify processFile was called with the correct parameters
      expect(mockProcessFile).toHaveBeenCalledWith(
        {
          s3key: validPayload.form.file.s3Key,
          ingestId: undefined,
          filename: undefined
        },
        expect.any(Object),
        expect.any(Object)
      )

      // Verify logging was called with correct parameters
      expect(mockLogInfo).toHaveBeenCalledWith(mockLogger, {
        category: 'land-data-ingest',
        message: 'Processing land data',
        context: {
          payload: JSON.stringify(validPayload)
        }
      })

      expect(mockLogInfo).toHaveBeenCalledWith(mockLogger, {
        category: 'land-data-ingest',
        message: 'Land data moved to processing',
        context: {
          payload: JSON.stringify(validPayload),
          s3Key: validPayload.form.file.s3Key,
          s3Bucket: mockBucket
        }
      })
    })

    test('should return 200 with success message when payload includes ingestId and filename and file is valid', async () => {
      const payload = {
        ...validPayload,
        metadata: {
          ingestId: 'ingest-123',
          filename: 'land-data.csv'
        }
      }
      const request = {
        method: 'POST',
        url: '/land-data-ingest/callback',
        payload
      }
      isValidIngestFile.mockResolvedValue(true)

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('Message received')

      // Verify processFile was called with the correct parameters
      expect(mockProcessFile).toHaveBeenCalledWith(
        {
          s3key: validPayload.form.file.s3Key,
          ingestId: 'ingest-123',
          filename: 'land-data.csv'
        },
        expect.any(Object),
        expect.any(Object)
      )

      // Verify logging was called with correct parameters
      expect(mockLogInfo).toHaveBeenCalledWith(mockLogger, {
        category: 'land-data-ingest',
        message: 'Processing land data',
        context: {
          payload: JSON.stringify(payload)
        }
      })

      expect(mockLogInfo).toHaveBeenCalledWith(mockLogger, {
        category: 'land-data-ingest',
        message: 'Land data moved to processing',
        context: {
          payload: JSON.stringify(payload),
          s3Key: validPayload.form.file.s3Key,
          s3Bucket: mockBucket
        }
      })
    })

    test('should return 400 when uploadStatus is invalid', async () => {
      const invalidPayload = {
        ...validPayload,
        uploadStatus: 'invalid-status'
      }

      const request = {
        method: 'POST',
        url: '/land-data-ingest/callback',
        payload: invalidPayload
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(message).toBe('Invalid request payload input')
    })

    test('should ignore error and return 200', async () => {
      // Mock processFile to throw an error
      mockProcessFile.mockRejectedValueOnce(new Error('Failed to process file'))

      const request = {
        method: 'POST',
        url: '/land-data-ingest/callback',
        payload: validPayload
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode } = await server.inject(request)

      expect(statusCode).toBe(200)
    })

    test('should return 400 when file has error', async () => {
      const payload = {
        ...validPayload,
        form: {
          file: {
            hasError: true,
            errorMessage: 'File has error'
          }
        }
      }

      const request = {
        method: 'POST',
        url: '/land-data-ingest/callback',
        payload
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(message).toBe('File has error')
    })

    test('should return 400 when file is not ready', async () => {
      const payload = {
        ...validPayload,
        form: {
          file: {
            ...validPayload.form.file,
            fileStatus: 'pending'
          }
        }
      }

      const request = {
        method: 'POST',
        url: '/land-data-ingest/callback',
        payload
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(message).toBe('File is not ready')
    })
  })
})
