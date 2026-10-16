import { Readable } from 'node:stream'
import { processActionsCsvFile } from './actions-csv.service.js'

import { getFile } from '~/src/features/common/s3/s3.js'
import { importData } from '~/src/features/land-data-ingest/service/import-land-data.service.js'

vi.mock('~/src/features/common/s3/s3.js')
vi.mock('~/src/features/land-data-ingest/service/import-land-data.service.js')

describe('processActionsCsvFile', () => {
  let mockLogger
  let mockS3Client
  const s3Key = 'land-grants/0.24.0/actions/actions_sidedness.csv'
  const bucket = 'configs-bucket'
  const entityName = 'actions_sidedness'

  beforeEach(() => {
    mockLogger = { info: vi.fn(), error: vi.fn() }
    mockS3Client = {}

    getFile.mockResolvedValue({
      Body: {
        transformToWebStream: () =>
          new Response('action_code,sidedness\nBND2,single-side\n').body
      }
    })
    importData.mockResolvedValue(true)
  })

  test('fetches the csv from the config bucket', async () => {
    await processActionsCsvFile(
      mockLogger,
      mockS3Client,
      s3Key,
      bucket,
      entityName
    )

    expect(getFile).toHaveBeenCalledWith(mockS3Client, bucket, s3Key)
  })

  test('imports the csv as the given entity, tagged with the s3 key', async () => {
    await processActionsCsvFile(
      mockLogger,
      mockS3Client,
      s3Key,
      bucket,
      entityName
    )

    expect(importData).toHaveBeenCalledWith(
      expect.any(Readable),
      { name: 'actions_sidedness', truncateTable: false },
      s3Key,
      undefined,
      mockLogger
    )
  })

  test('streams the csv body unchanged', async () => {
    let body = ''
    importData.mockImplementation(async (stream) => {
      for await (const chunk of stream) body += chunk
      return true
    })

    await processActionsCsvFile(
      mockLogger,
      mockS3Client,
      s3Key,
      bucket,
      entityName
    )

    expect(body).toBe('action_code,sidedness\nBND2,single-side\n')
  })

  test('propagates import failures', async () => {
    importData.mockRejectedValue(new Error('copy failed'))

    await expect(
      processActionsCsvFile(mockLogger, mockS3Client, s3Key, bucket, entityName)
    ).rejects.toThrow('copy failed')
  })
})
