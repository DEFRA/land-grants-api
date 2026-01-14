import Hapi from '@hapi/hapi'
import { LandDataIngestController } from './land-data-ingest.controller.js'
import { logInfo } from '~/src/api/common/helpers/logging/log-helpers.js'
import {
  moveFile,
  processingBucketPath,
  failedBucketPath
} from '../../common/s3/s3.js'
import { config } from '~/src/config/index.js'
import { createS3Client } from '../../common/plugins/s3-client.js'
import { processFile, createTaskInfo } from '../service/ingest.service.js'
import { vi } from 'vitest'

// Mock dependencies
vi.mock('~/src/api/common/helpers/logging/log-helpers.js')
vi.mock('../../common/s3/s3.js')
vi.mock('~/src/config/index.js')
vi.mock('../../common/plugins/s3-client.js')
vi.mock('../service/ingest.service.js', async () => ({
  ...(await vi.importActual('../service/ingest.service.js')),
  processFile: vi.fn(),
  createTaskInfo: vi.fn()
}))

const mockProcessFile = processFile
const mockCreateTaskInfo = createTaskInfo
const mockLogInfo = logInfo
const mockMoveFile = moveFile
const mockProcessingBucketPath = processingBucketPath
const mockFailedBucketPath = failedBucketPath
const mockConfig = config
const mockCreateS3Client = createS3Client

describe('LandDataIngestController', () => {
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
    await server.register([
      {
        plugin: {
          name: 'land-data-ingest',
          register: (server) => {
            server.route({
              method: 'POST',
              path: '/land-data-ingest/callback',
              handler: LandDataIngestController.handler,
              options: LandDataIngestController.options
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
        validPayload.form.file.s3Key,
        expect.any(Object),
        'land-data-ingest',
        expect.any(String), // title
        expect.any(Number) // taskId
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
  })
})
