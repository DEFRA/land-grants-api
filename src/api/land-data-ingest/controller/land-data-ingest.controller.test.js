import Hapi from '@hapi/hapi'
import { LandDataIngestController } from './land-data-ingest.controller.js'
import { logInfo } from '~/src/api/common/helpers/logging/log-helpers.js'

// Mock dependencies
jest.mock('~/src/api/common/helpers/logging/log-helpers.js')

const mockLogInfo = logInfo

describe('LandDataIngestController', () => {
  const server = Hapi.server()

  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
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

      // Verify logging was called with correct parameters
      expect(mockLogInfo).toHaveBeenCalledWith(mockLogger, {
        category: 'land-data-ingest',
        message: 'Processing land data',
        context: validPayload.form
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
  })
})
