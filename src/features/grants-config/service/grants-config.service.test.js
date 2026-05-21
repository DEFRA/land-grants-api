import { processActionConfigFile } from './grants-config.service.js'

import { getFile } from '~/src/features/common/s3/s3.js'
import { getActionConfigByVersion } from '~/src/features/grants-config/queries/getActionConfigByVersion.query.js'
import { insertActionConfig } from '~/src/features/grants-config/queries/insertActionConfig.query.js'
import { transformActionConfig } from '~/src/features/grants-config/transforms/action-config.transform.js'

vi.mock('~/src/features/common/s3/s3.js')
vi.mock(
  '~/src/features/grants-config/queries/getActionConfigByVersion.query.js'
)
vi.mock('~/src/features/grants-config/queries/insertActionConfig.query.js')
vi.mock('~/src/features/grants-config/transforms/action-config.transform.js')

describe('processActionConfigFile', () => {
  let mockLogger
  let mockS3Client
  let mockDb
  const s3Key = 'land-grants/0.0.2/actions/PA3/pa3-1.0.0.json'
  const bucket = 'configs-bucket'

  const transformedConfig = {
    code: 'PA3',
    semanticVersion: '1.0.0',
    major: 1,
    minor: 0,
    patch: 0,
    displayOrder: 0,
    config: { start_date: '2025-01-01', rules: [] }
  }

  beforeEach(() => {
    mockLogger = { info: vi.fn(), error: vi.fn() }
    mockS3Client = {}
    mockDb = {}

    getFile.mockResolvedValue({
      Body: {
        transformToString: vi
          .fn()
          .mockResolvedValue(JSON.stringify({ code: 'PA3' }))
      }
    })
    transformActionConfig.mockReturnValue(transformedConfig)
    getActionConfigByVersion.mockResolvedValue(false)
    insertActionConfig.mockResolvedValue(true)
  })

  test('fetches the file from S3 with the correct key and bucket', async () => {
    await processActionConfigFile(
      mockLogger,
      mockS3Client,
      mockDb,
      s3Key,
      bucket
    )

    expect(getFile).toHaveBeenCalledWith(mockS3Client, bucket, s3Key)
  })

  test('transforms the parsed JSON', async () => {
    const jsonContent = { code: 'PA3', semanticVersion: '1.0.0' }
    getFile.mockResolvedValue({
      Body: {
        transformToString: vi
          .fn()
          .mockResolvedValue(JSON.stringify(jsonContent))
      }
    })

    await processActionConfigFile(
      mockLogger,
      mockS3Client,
      mockDb,
      s3Key,
      bucket
    )

    expect(transformActionConfig).toHaveBeenCalledWith(jsonContent)
  })

  test('checks the DB for an existing version', async () => {
    await processActionConfigFile(
      mockLogger,
      mockS3Client,
      mockDb,
      s3Key,
      bucket
    )

    expect(getActionConfigByVersion).toHaveBeenCalledWith(
      mockLogger,
      mockDb,
      'PA3',
      '1.0.0'
    )
  })

  test('skips insertion when the version already exists', async () => {
    getActionConfigByVersion.mockResolvedValue(true)

    await processActionConfigFile(
      mockLogger,
      mockS3Client,
      mockDb,
      s3Key,
      bucket
    )

    expect(insertActionConfig).not.toHaveBeenCalled()
  })

  test('inserts the config when the version does not exist', async () => {
    getActionConfigByVersion.mockResolvedValue(false)

    await processActionConfigFile(
      mockLogger,
      mockS3Client,
      mockDb,
      s3Key,
      bucket
    )

    expect(insertActionConfig).toHaveBeenCalledWith(mockLogger, mockDb, {
      code: 'PA3',
      config: transformedConfig.config,
      major: 1,
      minor: 0,
      patch: 0,
      displayOrder: 0
    })
  })

  test('logs info when skipping an existing version', async () => {
    getActionConfigByVersion.mockResolvedValue(true)

    await processActionConfigFile(
      mockLogger,
      mockS3Client,
      mockDb,
      s3Key,
      bucket
    )

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('already exists')
    )
  })

  test('propagates S3 errors', async () => {
    getFile.mockRejectedValue(new Error('S3 unavailable'))

    await expect(
      processActionConfigFile(mockLogger, mockS3Client, mockDb, s3Key, bucket)
    ).rejects.toThrow('S3 unavailable')
  })
})
