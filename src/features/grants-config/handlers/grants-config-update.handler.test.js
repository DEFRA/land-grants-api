import { processMessage } from './grants-config-update.handler.js'

import { processActionConfigFile } from '~/src/features/grants-config/service/grants-config.service.js'

vi.mock('~/src/features/grants-config/service/grants-config.service.js')

/**
 * Builds an SNS-wrapped SQS message body matching the shape produced by
 * grants-config-broker's publishMessage(manifest, { grant, path, version, status }).
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
      Type: 'Notification',
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
          Type: 'Notification',
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

  describe('raw messages (local testing)', () => {
    test('processes a raw message with grant, manifest and status fields', async () => {
      const rawMessage = {
        MessageId: 'msg-raw',
        Body: JSON.stringify({
          grant: 'land-grants',
          manifest: ['land-grants/0.0.2/actions/PA3/pa3-1.0.0.json'],
          status: 'active'
        })
      }

      await processMessage(
        rawMessage,
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

    test('skips a raw message for a different grant', async () => {
      const rawMessage = {
        MessageId: 'msg-raw-other',
        Body: JSON.stringify({
          grant: 'example-grant-with-auth',
          manifest: ['example-grant-with-auth/0.0.1/grants-ui/file1.txt'],
          status: 'active'
        })
      }

      await processMessage(
        rawMessage,
        mockS3Client,
        mockDb,
        mockLogger,
        options
      )

      expect(processActionConfigFile).not.toHaveBeenCalled()
    })
  })
})
