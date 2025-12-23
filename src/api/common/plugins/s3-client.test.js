import { s3Client, createS3Client } from '~/src/api/common/plugins/s3-client.js'
import { S3Client } from '@aws-sdk/client-s3'
import { vi } from 'vitest'

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    destroy: vi.fn()
  }))
}))

vi.mock('~/src/config/index.js', () => ({
  config: {
    get: vi.fn((key) => {
      const config = {
        's3.region': 'eu-west-2',
        's3.endpoint': 'http://localhost:4566',
        's3.bucket': 'test-bucket',
        isLocal: true,
        isDevelopment: false
      }
      return config[key]
    })
  }
}))

describe('#s3Client', () => {
  let mockServer
  let mockDecorate
  let mockEventsOn
  let mockLogger

  beforeEach(() => {
    vi.clearAllMocks()
    mockDecorate = vi.fn()
    mockEventsOn = vi.fn()
    mockLogger = {
      info: vi.fn()
    }
    mockServer = {
      decorate: mockDecorate,
      events: {
        on: mockEventsOn
      },
      logger: mockLogger
    }
  })

  test('Should have the correct plugin name', () => {
    expect(s3Client.plugin.name).toBe('s3Client')
  })

  test('Should have the correct plugin version', () => {
    expect(s3Client.plugin.version).toBe('0.1.0')
  })

  test('Should export options with correct configuration', () => {
    expect(s3Client.options).toEqual({
      region: 'eu-west-2',
      endpoint: 'http://localhost:4566',
      bucket: 'test-bucket',
      forcePathStyle: true
    })
  })

  test('Should register S3 client and decorate server and request', () => {
    s3Client.plugin.register(mockServer)

    expect(S3Client).toHaveBeenCalledWith({
      region: 'eu-west-2',
      endpoint: 'http://localhost:4566',
      forcePathStyle: true,
      credentials: expect.any(Object)
    })

    expect(mockDecorate).toHaveBeenCalledTimes(2)
    expect(mockDecorate).toHaveBeenCalledWith(
      'request',
      's3',
      expect.any(Object)
    )
    expect(mockDecorate).toHaveBeenCalledWith(
      'server',
      's3',
      expect.any(Object)
    )
  })

  test('Should register stop event handler', () => {
    s3Client.plugin.register(mockServer)

    expect(mockEventsOn).toHaveBeenCalledTimes(1)
    expect(mockEventsOn).toHaveBeenCalledWith('stop', expect.any(Function))
  })

  test('Should destroy S3 client and log on server stop', () => {
    s3Client.plugin.register(mockServer)

    const stopHandler = mockEventsOn.mock.calls[0][1]
    const clientInstance =
      S3Client.mock.results[S3Client.mock.results.length - 1].value

    stopHandler()

    expect(mockLogger.info).toHaveBeenCalledWith('Closing S3 client')
    expect(clientInstance.destroy).toHaveBeenCalled()
  })

  describe('#createS3Client', () => {
    test('Should create S3 client with correct configuration', () => {
      const client = createS3Client()

      expect(S3Client).toHaveBeenCalledWith({
        region: 'eu-west-2',
        endpoint: 'http://localhost:4566',
        forcePathStyle: true,
        credentials: expect.any(Object)
      })

      expect(client).toHaveProperty('destroy')
    })
  })
})
