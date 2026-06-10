import { processMessage } from './grants-config-update.handler.js'

import { processActionConfigFile } from '~/src/features/grants-config/service/grants-config.service.js'

vi.mock('~/src/features/grants-config/service/grants-config.service.js')

/**
 * Builds an SNS-wrapped SQS message (standard SNS delivery, no RawMessageDelivery).
 * Body is the SNS notification envelope; attributes use { Type, Value } shape.
 */
function buildSnsMessage({
  grant = 'land-grants',
  version = '0.0.2',
  status = 'active',
  path = 's3://grants-config',
  manifest = [
    'land-grants/0.0.2/actions/PA3/pa3-1.0.0.json',
    'land-grants/0.0.2/metadata.json'
  ]
} = {}) {
  return {
    MessageId: 'msg-1',
    Body: JSON.stringify({
      Message: JSON.stringify(manifest),
      MessageAttributes: {
        grant: { Type: 'String', Value: grant },
        version: { Type: 'String', Value: version },
        status: { Type: 'String', Value: status },
        path: { Type: 'String', Value: path }
      }
    })
  }
}

/**
 * Builds a raw-delivery SQS message (RawMessageDelivery=true on the SNS subscription).
 * Body is the manifest array directly; attributes are on the SQS envelope with { DataType, StringValue }.
 */
function buildDirectMessage({
  grant = 'land-grants',
  version = '1.2.3',
  status = 'active',
  path = 'cdp-grants-config-broker-dev',
  manifest = [
    'land-grants/1.2.3/actions/PA3/pa3-2.0.0.json',
    'land-grants/1.2.3/metadata.json'
  ]
} = {}) {
  return {
    MessageId: 'msg-direct-1',
    Body: JSON.stringify(manifest),
    MessageAttributes: {
      grant: { DataType: 'String', StringValue: grant },
      version: { DataType: 'String', StringValue: version },
      status: { DataType: 'String', StringValue: status },
      path: { DataType: 'String', StringValue: path }
    }
  }
}

describe('processMessage', () => {
  let mockLogger
  let mockS3Client
  let mockDb
  const options = { grantsConfigBucket: 'configs-bucket' }

  beforeEach(() => {
    mockLogger = { info: vi.fn(), error: vi.fn() }
    mockS3Client = {}
    mockDb = {}
    processActionConfigFile.mockResolvedValue(undefined)
  })

  describe('grant filtering', () => {
    test('processes a message for grant "land-grants"', async () => {
      await processMessage(
        buildSnsMessage(),
        mockS3Client,
        mockDb,
        mockLogger,
        options
      )

      expect(processActionConfigFile).toHaveBeenCalledTimes(1)
    })

    test('skips a message for a different grant', async () => {
      await processMessage(
        buildSnsMessage({ grant: 'example-grant-with-auth', status: 'active' }),
        mockS3Client,
        mockDb,
        mockLogger,
        options
      )

      expect(processActionConfigFile).not.toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('grant="example-grant-with-auth"')
      )
    })

    test('skips a message when grant attribute is absent', async () => {
      const noGrantMessage = {
        MessageId: 'msg-no-grant',
        Body: JSON.stringify({
          Message: JSON.stringify([
            'land-grants/0.0.2/actions/PA3/pa3-1.0.0.json'
          ]),
          MessageAttributes: {
            status: { Type: 'String', Value: 'active' }
          }
        })
      }

      await processMessage(
        noGrantMessage,
        mockS3Client,
        mockDb,
        mockLogger,
        options
      )

      expect(processActionConfigFile).not.toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('grant="undefined"')
      )
    })
  })

  describe('status filtering', () => {
    test('processes a message with status "active"', async () => {
      await processMessage(
        buildSnsMessage({ status: 'active' }),
        mockS3Client,
        mockDb,
        mockLogger,
        options
      )

      expect(processActionConfigFile).toHaveBeenCalledTimes(1)
    })

    test('skips a message with status "draft"', async () => {
      await processMessage(
        buildSnsMessage({ status: 'draft' }),
        mockS3Client,
        mockDb,
        mockLogger,
        options
      )

      expect(processActionConfigFile).not.toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('status="draft"')
      )
    })

    test('skips a message with status "none"', async () => {
      await processMessage(
        buildSnsMessage({ status: 'none' }),
        mockS3Client,
        mockDb,
        mockLogger,
        options
      )

      expect(processActionConfigFile).not.toHaveBeenCalled()
    })
  })

  describe('manifest processing', () => {
    test('processes only action config files from the manifest', async () => {
      await processMessage(
        buildSnsMessage(),
        mockS3Client,
        mockDb,
        mockLogger,
        options
      )

      expect(processActionConfigFile).toHaveBeenCalledTimes(1)
      expect(processActionConfigFile).toHaveBeenCalledWith(
        mockLogger,
        mockS3Client,
        mockDb,
        'land-grants/0.0.2/actions/PA3/pa3-1.0.0.json',
        'configs-bucket'
      )
    })

    test('skips non-action files in the manifest', async () => {
      await processMessage(
        buildSnsMessage(),
        mockS3Client,
        mockDb,
        mockLogger,
        options
      )

      const calledKeys = processActionConfigFile.mock.calls.map((c) => c[3])
      expect(calledKeys).not.toContain('land-grants/0.0.2/metadata.json')
    })

    test('processes multiple action files in the manifest', async () => {
      const message = buildSnsMessage({
        manifest: [
          'land-grants/0.0.2/actions/PA3/pa3-1.0.0.json',
          'land-grants/0.0.2/actions/CSAM3/csam3-1.0.0.json',
          'land-grants/0.0.2/metadata.json'
        ]
      })

      await processMessage(message, mockS3Client, mockDb, mockLogger, options)

      expect(processActionConfigFile).toHaveBeenCalledTimes(2)
    })

    test('does nothing when the manifest has no action files', async () => {
      const message = buildSnsMessage({
        manifest: ['land-grants/0.0.2/metadata.json']
      })

      await processMessage(message, mockS3Client, mockDb, mockLogger, options)

      expect(processActionConfigFile).not.toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('No action config files found')
      )
    })
  })
})

describe('processMessage — raw SQS delivery (RawMessageDelivery=true)', () => {
  let mockLogger
  let mockS3Client
  let mockDb
  const options = { grantsConfigBucket: 'configs-bucket' }

  beforeEach(() => {
    mockLogger = { info: vi.fn(), error: vi.fn() }
    mockS3Client = {}
    mockDb = {}
    processActionConfigFile.mockResolvedValue(undefined)
  })

  test('processes an action file from a direct message', async () => {
    await processMessage(
      buildDirectMessage(),
      mockS3Client,
      mockDb,
      mockLogger,
      options
    )

    expect(processActionConfigFile).toHaveBeenCalledTimes(1)
    expect(processActionConfigFile).toHaveBeenCalledWith(
      mockLogger,
      mockS3Client,
      mockDb,
      'land-grants/1.2.3/actions/PA3/pa3-2.0.0.json',
      'configs-bucket'
    )
  })

  test('logs the version from message attributes', async () => {
    await processMessage(
      buildDirectMessage({ version: '1.2.3' }),
      mockS3Client,
      mockDb,
      mockLogger,
      options
    )

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('version="1.2.3"')
    )
  })

  test('skips a message for a different grant', async () => {
    await processMessage(
      buildDirectMessage({ grant: 'other-grant' }),
      mockS3Client,
      mockDb,
      mockLogger,
      options
    )

    expect(processActionConfigFile).not.toHaveBeenCalled()
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('grant="other-grant"')
    )
  })

  test('skips a message with status "draft"', async () => {
    await processMessage(
      buildDirectMessage({ status: 'draft' }),
      mockS3Client,
      mockDb,
      mockLogger,
      options
    )

    expect(processActionConfigFile).not.toHaveBeenCalled()
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('status="draft"')
    )
  })

  test('does nothing when the manifest has no action files', async () => {
    await processMessage(
      buildDirectMessage({ manifest: ['land-grants/1.2.3/metadata.json'] }),
      mockS3Client,
      mockDb,
      mockLogger,
      options
    )

    expect(processActionConfigFile).not.toHaveBeenCalled()
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('No action config files found')
    )
  })
})
