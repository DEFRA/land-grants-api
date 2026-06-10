import { processMessage } from './grants-config-update.handler.js'

import { processActionConfigFile } from '~/src/features/grants-config/service/grants-config.service.js'

vi.mock('~/src/features/grants-config/service/grants-config.service.js')

function buildMessage({
  grant = 'land-grants',
  version = '0.1.1',
  status = 'active',
  path = 'dev-grants-config-c63f2',
  manifest = [
    'land-grants/0.1.1/actions/PA3/pa3-1.0.0.json',
    'land-grants/0.1.1/metadata.json'
  ]
} = {}) {
  return {
    MessageId: 'msg-1',
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
        buildMessage(),
        mockS3Client,
        mockDb,
        mockLogger,
        options
      )

      expect(processActionConfigFile).toHaveBeenCalledTimes(1)
    })

    test('skips a message for a different grant', async () => {
      await processMessage(
        buildMessage({ grant: 'example-grant-with-auth' }),
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
        Body: JSON.stringify(['land-grants/0.1.1/actions/PA3/pa3-1.0.0.json']),
        MessageAttributes: {
          status: { DataType: 'String', StringValue: 'active' }
        }
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
        buildMessage({ status: 'active' }),
        mockS3Client,
        mockDb,
        mockLogger,
        options
      )

      expect(processActionConfigFile).toHaveBeenCalledTimes(1)
    })

    test('skips a message with status "draft"', async () => {
      await processMessage(
        buildMessage({ status: 'draft' }),
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
        buildMessage({ status: 'none' }),
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
        buildMessage(),
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
        'land-grants/0.1.1/actions/PA3/pa3-1.0.0.json',
        'configs-bucket'
      )
    })

    test('skips non-action files in the manifest', async () => {
      await processMessage(
        buildMessage(),
        mockS3Client,
        mockDb,
        mockLogger,
        options
      )

      const calledKeys = processActionConfigFile.mock.calls.map((c) => c[3])
      expect(calledKeys).not.toContain('land-grants/0.1.1/metadata.json')
    })

    test('processes multiple action files in the manifest', async () => {
      const message = buildMessage({
        manifest: [
          'land-grants/0.1.1/actions/PA3/pa3-1.0.0.json',
          'land-grants/0.1.1/actions/CSAM3/csam3-1.0.0.json',
          'land-grants/0.1.1/metadata.json'
        ]
      })

      await processMessage(message, mockS3Client, mockDb, mockLogger, options)

      expect(processActionConfigFile).toHaveBeenCalledTimes(2)
    })

    test('does nothing when the manifest has no action files', async () => {
      const message = buildMessage({
        manifest: ['land-grants/0.1.1/metadata.json']
      })

      await processMessage(message, mockS3Client, mockDb, mockLogger, options)

      expect(processActionConfigFile).not.toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('No action config files found')
      )
    })

    test('logs the version from message attributes', async () => {
      await processMessage(
        buildMessage({ version: '0.1.1' }),
        mockS3Client,
        mockDb,
        mockLogger,
        options
      )

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('version="0.1.1"')
      )
    })
  })
})
