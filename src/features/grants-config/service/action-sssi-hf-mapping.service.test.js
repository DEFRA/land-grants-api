import { Readable } from 'node:stream'
import { processActionSssiHfMappingFile } from './action-sssi-hf-mapping.service.js'

import { getFile } from '~/src/features/common/s3/s3.js'
import { importData } from '~/src/features/land-data-ingest/service/import-land-data.service.js'

vi.mock('~/src/features/common/s3/s3.js')
vi.mock('~/src/features/land-data-ingest/service/import-land-data.service.js')

describe('processActionSssiHfMappingFile', () => {
  let mockLogger
  let mockS3Client
  const s3Key = 'land-grants/0.24.0/actions/action_sssi_hf_mapping.csv'
  const bucket = 'configs-bucket'

  beforeEach(() => {
    mockLogger = { info: vi.fn(), error: vi.fn() }
    mockS3Client = {}

    getFile.mockResolvedValue({
      Body: {
        transformToWebStream: () =>
          new Response('action_code,has_sssi,has_hf\nUPL1,1,1\n').body
      }
    })
    importData.mockResolvedValue(true)
  })

  test('fetches the csv from the config bucket', async () => {
    await processActionSssiHfMappingFile(
      mockLogger,
      mockS3Client,
      s3Key,
      bucket
    )

    expect(getFile).toHaveBeenCalledWith(mockS3Client, bucket, s3Key)
  })

  test('imports the csv as the action_sssi_hf_mapping entity, tagged with the s3 key', async () => {
    await processActionSssiHfMappingFile(
      mockLogger,
      mockS3Client,
      s3Key,
      bucket
    )

    expect(importData).toHaveBeenCalledWith(
      expect.any(Readable),
      { name: 'action_sssi_hf_mapping', truncateTable: false },
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

    await processActionSssiHfMappingFile(
      mockLogger,
      mockS3Client,
      s3Key,
      bucket
    )

    expect(body).toBe('action_code,has_sssi,has_hf\nUPL1,1,1\n')
  })

  test('propagates import failures', async () => {
    importData.mockRejectedValue(new Error('copy failed'))

    await expect(
      processActionSssiHfMappingFile(mockLogger, mockS3Client, s3Key, bucket)
    ).rejects.toThrow('copy failed')
  })
})
