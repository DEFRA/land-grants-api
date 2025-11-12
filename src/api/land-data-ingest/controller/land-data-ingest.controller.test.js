import Hapi from '@hapi/hapi'
import { LandDataIngestController } from './land-data-ingest.controller.js'
import {
  logInfo,
  logBusinessError
} from '~/src/api/common/helpers/logging/log-helpers.js'
import {
  moveFile,
  processingBucketPath,
  failedBucketPath
} from '../../common/s3/s3.js'
import { config } from '~/src/config/index.js'
import { createS3Client } from '../../common/plugins/s3-client.js'

// Mock dependencies
jest.mock('~/src/api/common/helpers/logging/log-helpers.js')
jest.mock('../../common/s3/s3.js')
jest.mock('~/src/config/index.js')
jest.mock('../../common/plugins/s3-client.js')

const mockLogInfo = logInfo
const mockLogBusinessError = logBusinessError
const mockMoveFile = moveFile
const mockProcessingBucketPath = processingBucketPath
const mockFailedBucketPath = failedBucketPath
const mockConfig = config
const mockCreateS3Client = createS3Client

describe('LandDataIngestController', () => {
  const server = Hapi.server()

  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }

  const mockS3Client = {
    send: jest.fn()
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
        s3Key: 'uploads/land-data.csv',
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
    jest.clearAllMocks()

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

      // Verify moveFile was called to move file to processing
      expect(mockMoveFile).toHaveBeenCalledWith(
        mockS3Client,
        mockBucket,
        validPayload.form.file.s3Key,
        `processing/${validPayload.form.file.s3Key}`
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
          sourceKey: validPayload.form.file.s3Key,
          destinationKey: `processing/${validPayload.form.file.s3Key}`,
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

    test('should return 500 and move file to failed bucket when error occurs', async () => {
      // First call fails, second call succeeds
      mockMoveFile.mockRejectedValueOnce(
        new Error('Failed to move to processing')
      )
      mockMoveFile.mockResolvedValueOnce({
        success: true,
        message: 'File moved successfully'
      })

      const request = {
        method: 'POST',
        url: '/land-data-ingest/callback',
        payload: validPayload
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, result } = await server.inject(request)

      expect(statusCode).toBe(500)
      expect(result.message).toBe('An internal server error occurred')

      // Verify moveFile was called twice - once for processing (failed), once for failed bucket
      expect(mockMoveFile).toHaveBeenCalledTimes(2)

      // First call: attempt to move to processing
      expect(mockMoveFile).toHaveBeenNthCalledWith(
        1,
        mockS3Client,
        mockBucket,
        validPayload.form.file.s3Key,
        `processing/${validPayload.form.file.s3Key}`
      )

      // Second call: move to failed bucket
      expect(mockMoveFile).toHaveBeenNthCalledWith(
        2,
        mockS3Client,
        mockBucket,
        validPayload.form.file.s3Key,
        `failed/${validPayload.form.file.s3Key}`
      )

      // Verify logBusinessError was called
      expect(mockLogBusinessError).toHaveBeenCalledWith(
        mockLogger,
        expect.objectContaining({
          operation: 'land-data-ingest_error',
          error: expect.any(Error),
          context: {
            payload: JSON.stringify(validPayload),
            sourceKey: validPayload.form.file.s3Key,
            destinationKey: `failed/${validPayload.form.file.s3Key}`,
            s3Bucket: mockBucket
          }
        })
      )
    })
  })
})
