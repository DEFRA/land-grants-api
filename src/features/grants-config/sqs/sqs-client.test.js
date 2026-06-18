import { vi } from 'vitest'
import { Consumer } from 'sqs-consumer'
import { grantsConfigSqsPlugin } from './sqs-client.js'

const mockSqsClientInstance = {
  send: vi.fn(),
  destroy: vi.fn()
}

vi.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: class MockSQSClient {
    constructor() {
      return mockSqsClientInstance
    }
  }
}))

vi.mock('sqs-consumer')

vi.mock('~/src/config/index.js', () => ({
  config: {
    get: vi.fn((key) => {
      switch (key) {
        case 'sqs.region':
          return 'eu-west-2'
        case 'sqs.endpoint':
          return 'http://localhost:4566'
        case 'sqs.queueUrl':
          return 'http://localhost:4566/000000000000/grants_config_broker_update'
        case 'grantsConfig.s3Bucket':
          return 'configs-bucket'
        default:
          return undefined
      }
    })
  }
}))

vi.mock(
  '~/src/features/grants-config/handlers/grants-config-update.handler.js',
  () => ({
    processMessage: vi.fn()
  })
)

describe('grantsConfigSqsPlugin', () => {
  let server
  let mockConsumer
  let mockLogger

  const options = {
    sqsRegion: 'eu-west-2',
    sqsEndpoint: 'http://localhost:4566',
    queueUrl: 'http://localhost:4566/000000000000/grants_config_broker_update',
    grantsConfigBucket: 'configs-bucket'
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockLogger = { info: vi.fn(), error: vi.fn() }

    server = {
      logger: mockLogger,
      s3: {},
      postgresDb: {},
      events: { on: vi.fn() }
    }

    mockConsumer = {
      start: vi.fn(),
      stop: vi.fn(),
      on: vi.fn()
    }

    Consumer.create = vi.fn().mockReturnValue(mockConsumer)
  })

  test('creates a Consumer with the correct options', () => {
    grantsConfigSqsPlugin.plugin.register(server, options)

    expect(Consumer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        queueUrl: options.queueUrl,
        handleMessage: expect.any(Function),
        sqs: mockSqsClientInstance,
        batchSize: 1,
        waitTimeSeconds: 20,
        visibilityTimeout: 30,
        handleMessageTimeout: 30000,
        attributeNames: ['All'],
        messageAttributeNames: ['All']
      })
    )
  })

  test('starts the consumer on registration', () => {
    grantsConfigSqsPlugin.plugin.register(server, options)

    expect(mockConsumer.start).toHaveBeenCalled()
  })

  test('registers error, processing_error, and started event handlers', () => {
    grantsConfigSqsPlugin.plugin.register(server, options)

    const eventNames = mockConsumer.on.mock.calls.map((c) => c[0])
    expect(eventNames).toContain('error')
    expect(eventNames).toContain('processing_error')
    expect(eventNames).toContain('started')
  })

  test('logs on consumer start event', () => {
    grantsConfigSqsPlugin.plugin.register(server, options)

    const startedHandler = mockConsumer.on.mock.calls.find(
      (c) => c[0] === 'started'
    )[1]
    startedHandler()

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('SQS Consumer started')
    )
  })

  test('logs consumer errors', () => {
    grantsConfigSqsPlugin.plugin.register(server, options)

    const errorHandler = mockConsumer.on.mock.calls.find(
      (c) => c[0] === 'error'
    )[1]
    const error = new Error('Consumer error')
    errorHandler(error)

    expect(mockLogger.error).toHaveBeenCalledWith(
      error,
      expect.stringContaining('Consumer error')
    )
  })

  test('stops the consumer and destroys the SQS client on server stop', () => {
    grantsConfigSqsPlugin.plugin.register(server, options)

    const stopHandler = server.events.on.mock.calls.find(
      (c) => c[0] === 'stop'
    )[1]
    stopHandler()

    expect(mockConsumer.stop).toHaveBeenCalled()
    expect(mockSqsClientInstance.destroy).toHaveBeenCalled()
  })

  describe('handleMessage', () => {
    let handleMessage

    beforeEach(() => {
      grantsConfigSqsPlugin.plugin.register(server, options)
      handleMessage = Consumer.create.mock.calls[0][0].handleMessage
    })

    test('calls processMessage with the correct arguments', async () => {
      const { processMessage } =
        await import('~/src/features/grants-config/handlers/grants-config-update.handler.js')
      const message = { MessageId: 'msg-1', Body: '{}' }

      await handleMessage(message)

      expect(processMessage).toHaveBeenCalledWith(
        message,
        server.s3,
        server.postgresDb,
        server.logger,
        { grantsConfigBucket: options.grantsConfigBucket }
      )
    })

    test('logs success after processMessage resolves', async () => {
      const message = { MessageId: 'msg-1', Body: '{}' }

      await handleMessage(message)

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('msg-1')
      )
    })

    test('returns the message after successful processing', async () => {
      const message = { MessageId: 'msg-1', Body: '{}' }

      const result = await handleMessage(message)

      expect(result).toBe(message)
    })

    test('logs error and rethrows when processMessage throws', async () => {
      const { processMessage } =
        await import('~/src/features/grants-config/handlers/grants-config-update.handler.js')
      const error = new Error('processing failed')
      processMessage.mockRejectedValueOnce(error)
      const message = { MessageId: 'msg-err', Body: '{}' }

      await expect(handleMessage(message)).rejects.toThrow('processing failed')

      expect(mockLogger.error).toHaveBeenCalledWith(
        error,
        expect.stringContaining('Failed to process')
      )
    })

    test('does not return message when processMessage throws', async () => {
      const { processMessage } =
        await import('~/src/features/grants-config/handlers/grants-config-update.handler.js')
      const error = new Error('processing failed')
      processMessage.mockRejectedValueOnce(error)
      const message = { MessageId: 'msg-err', Body: '{}' }

      const result = await handleMessage(message).catch(() => 'caught')

      expect(result).toBe('caught')
      expect(result).not.toBe(message)
    })
  })

  test('logs processing_error events', () => {
    grantsConfigSqsPlugin.plugin.register(server, options)

    const handler = mockConsumer.on.mock.calls.find(
      (c) => c[0] === 'processing_error'
    )[1]
    const error = new Error('processing error')
    handler(error)

    expect(mockLogger.error).toHaveBeenCalledWith(
      error,
      expect.stringContaining('processing error')
    )
  })

  test('plugin options derive values from config', () => {
    expect(grantsConfigSqsPlugin.options.sqsRegion).toBe('eu-west-2')
    expect(grantsConfigSqsPlugin.options.sqsEndpoint).toBe(
      'http://localhost:4566'
    )
    expect(grantsConfigSqsPlugin.options.queueUrl).toBe(
      'http://localhost:4566/000000000000/grants_config_broker_update'
    )
    expect(grantsConfigSqsPlugin.options.grantsConfigBucket).toBe(
      'configs-bucket'
    )
  })
})
