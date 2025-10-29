import Hapi from '@hapi/hapi'
import { InitiateLandDataUploadController } from './initiate-land-data-upload.controller.js'
import { logInfo } from '~/src/api/common/helpers/logging/log-helpers.js'
import { initiateLandDataUpload } from '../service/ingest-schedule.service.js'
import { config } from '~/src/config/index.js'

// Mock dependencies
jest.mock('~/src/api/common/helpers/logging/log-helpers.js')
jest.mock('../service/ingest-schedule.service.js')
jest.mock('~/src/config/index.js')

const mockLogInfo = logInfo
const mockInitiateLandDataUpload = initiateLandDataUpload
const mockConfig = config

describe('InitiateLandDataUploadController', () => {
  const server = Hapi.server()

  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }

  const validPayload = {
    filename: 'land-parcels.csv',
    type: 'parcels'
  }

  const mockEndpoint = 'https://cdp-uploader.example.com/initiate'
  const mockCallback = 'https://api.example.com/land-data-ingest/callback'
  const mockBucket = 'land-grants-bucket'
  const mockGrantsUiHost = 'https://grants-ui.example.com'
  const mockUploadUrl = '/upload/abc123'

  beforeAll(async () => {
    server.decorate('request', 'logger', mockLogger)
    await server.register([
      {
        plugin: {
          name: 'initiate-land-data-upload',
          register: (server) => {
            server.route({
              method: 'POST',
              path: '/land-data-ingest/initiate',
              handler: InitiateLandDataUploadController.handler,
              options: InitiateLandDataUploadController.options
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

    // Setup default config mocks
    mockConfig.get.mockImplementation((key) => {
      const configMap = {
        's3.bucket': mockBucket,
        'ingest.endpoint': mockEndpoint,
        'ingest.callback': mockCallback,
        'ingest.grantsUiHost': mockGrantsUiHost
      }
      return configMap[key]
    })

    // Setup default service mock
    mockInitiateLandDataUpload.mockResolvedValue({
      uploadUrl: mockUploadUrl
    })
  })

  describe('POST /land-data-ingest/initiate route', () => {
    test('should return 200 with upload URL when payload is valid', async () => {
      const request = {
        method: 'POST',
        url: '/land-data-ingest/initiate',
        payload: validPayload
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, uploadUrl }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('Land data upload initiated')
      expect(uploadUrl).toBe(`${mockGrantsUiHost}${mockUploadUrl}`)

      // Verify service was called with correct parameters
      expect(mockInitiateLandDataUpload).toHaveBeenCalledWith(
        mockEndpoint,
        mockCallback,
        mockBucket,
        validPayload
      )

      // Verify logging was called
      expect(mockLogInfo).toHaveBeenCalledWith(mockLogger, {
        category: 'initiate-land-data-upload',
        message: 'Initiating land data upload',
        context: {
          payload: JSON.stringify(validPayload),
          s3Bucket: mockBucket,
          endpoint: mockEndpoint,
          callback: mockCallback,
          grantsUiHost: mockGrantsUiHost,
          frontendUrl: process.env.FRONTEND_URL
        }
      })
    })

    test('should use FRONTEND_URL when grantsUiHost is not configured', async () => {
      process.env.FRONTEND_URL = 'https://frontend.example.com'

      mockConfig.get.mockImplementation((key) => {
        const configMap = {
          's3.bucket': mockBucket,
          'ingest.endpoint': mockEndpoint,
          'ingest.callback': mockCallback,
          'ingest.grantsUiHost': null
        }
        return configMap[key]
      })

      const request = {
        method: 'POST',
        url: '/land-data-ingest/initiate',
        payload: validPayload
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { uploadUrl }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(uploadUrl).toBe(`https://frontend.example.com${mockUploadUrl}`)
    })

    test('should return 400 when filename is missing', async () => {
      const invalidPayload = {
        type: 'parcels'
      }

      const request = {
        method: 'POST',
        url: '/land-data-ingest/initiate',
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

    test('should return 400 when type is missing', async () => {
      const invalidPayload = {
        filename: 'land-parcels.csv'
      }

      const request = {
        method: 'POST',
        url: '/land-data-ingest/initiate',
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

    test('should return 400 when type is invalid', async () => {
      const invalidPayload = {
        filename: 'land-parcels.csv',
        type: 'invalid-type'
      }

      const request = {
        method: 'POST',
        url: '/land-data-ingest/initiate',
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

    test('should accept "covers" as a valid type', async () => {
      const validCoversPayload = {
        filename: 'land-covers.csv',
        type: 'covers'
      }

      const request = {
        method: 'POST',
        url: '/land-data-ingest/initiate',
        payload: validCoversPayload
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode } = await server.inject(request)

      expect(statusCode).toBe(200)
    })

    test('should accept "moorland" as a valid type', async () => {
      const validMoorlandPayload = {
        filename: 'moorland-data.csv',
        type: 'moorland'
      }

      const request = {
        method: 'POST',
        url: '/land-data-ingest/initiate',
        payload: validMoorlandPayload
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode } = await server.inject(request)

      expect(statusCode).toBe(200)
    })

    test('should return 500 when service throws an error', async () => {
      mockInitiateLandDataUpload.mockRejectedValue(
        new Error('CDP uploader error')
      )

      const request = {
        method: 'POST',
        url: '/land-data-ingest/initiate',
        payload: validPayload
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(500)
      expect(message).toBe('An internal server error occurred')
    })

    test('should log CDP uploader response', async () => {
      const mockResponse = {
        uploadUrl: mockUploadUrl,
        sessionId: 'session-123'
      }

      mockInitiateLandDataUpload.mockResolvedValue(mockResponse)

      const request = {
        method: 'POST',
        url: '/land-data-ingest/initiate',
        payload: validPayload
      }

      await server.inject(request)

      expect(mockLogInfo).toHaveBeenCalledWith(mockLogger, {
        category: 'initiate-land-data-upload',
        message: 'CDP uploader response',
        context: mockResponse
      })
    })

    test('should log the final upload URL', async () => {
      const request = {
        method: 'POST',
        url: '/land-data-ingest/initiate',
        payload: validPayload
      }

      await server.inject(request)

      expect(mockLogInfo).toHaveBeenCalledWith(mockLogger, {
        category: 'initiate-land-data-upload',
        message: 'Upload URL',
        context: { uploadUrl: `${mockGrantsUiHost}${mockUploadUrl}` }
      })
    })
  })
})
