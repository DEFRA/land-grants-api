import { Readable } from 'node:stream'
import { importFileFromBucket } from './import-file.service.js'
import { getEntityByName } from '../../common/constants/entity_types.js'
import { getFile } from '~/src/features/common/s3/s3.js'
import { importData } from '~/src/features/land-data-ingest/service/import-land-data.service.js'

vi.mock('~/src/features/common/s3/s3.js')
vi.mock('~/src/features/land-data-ingest/service/import-land-data.service.js')

describe('importFileFromBucket', () => {
  let mockLogger
  let mockS3Client
  const s3Key = 'land-grants/0.24.0/actions/actions_eligibility.csv'
  const bucket = 'configs-bucket'
  const entityType = getEntityByName('actions_eligibility')

  beforeEach(() => {
    mockLogger = { info: vi.fn(), error: vi.fn() }
    mockS3Client = {}

    getFile.mockResolvedValue({
      Body: {
        transformToWebStream: () =>
          new Response(
            'action_code,has_sssi,has_hf,sidedness\nBND2,1,1,single-side\n'
          ).body
      }
    })
    importData.mockResolvedValue(true)
  })

  test('should fetch the csv from the config bucket', async () => {
    await importFileFromBucket(
      mockLogger,
      mockS3Client,
      s3Key,
      bucket,
      entityType
    )

    expect(getFile).toHaveBeenCalledWith(mockS3Client, bucket, s3Key)
  })

  test('should import the csv as the given entity, tagged with the s3 key', async () => {
    await importFileFromBucket(
      mockLogger,
      mockS3Client,
      s3Key,
      bucket,
      entityType
    )

    expect(importData).toHaveBeenCalledWith(
      expect.any(Readable),
      entityType,
      s3Key,
      undefined,
      mockLogger
    )
  })

  test('should tag the rows with the given ingest id instead of the s3 key', async () => {
    await importFileFromBucket(
      mockLogger,
      mockS3Client,
      s3Key,
      bucket,
      entityType,
      'actions_eligibility.csv'
    )

    expect(importData).toHaveBeenCalledWith(
      expect.any(Readable),
      entityType,
      'actions_eligibility.csv',
      undefined,
      mockLogger
    )
  })

  test('should stream the csv body unchanged', async () => {
    let body = ''
    importData.mockImplementation(async (stream) => {
      for await (const chunk of stream) body += chunk
      return true
    })

    await importFileFromBucket(
      mockLogger,
      mockS3Client,
      s3Key,
      bucket,
      entityType
    )

    expect(body).toBe(
      'action_code,has_sssi,has_hf,sidedness\nBND2,1,1,single-side\n'
    )
  })

  test('should propagate import failures', async () => {
    importData.mockRejectedValue(new Error('copy failed'))

    await expect(
      importFileFromBucket(mockLogger, mockS3Client, s3Key, bucket, entityType)
    ).rejects.toThrow('copy failed')
  })
})
