import {
  createTestS3Client,
  uploadFixtureFile,
  ensureBucketExists,
  listTestFiles,
  clearTestBucket
} from './setup/s3-test-helpers.js'

import { importLandData } from '../api/land-data-ingest/workers/ingest-schedule.module.js'
import { connectToTestDatbase } from '../db-tests/setup/postgres.js'
import { getRecordsByQuery } from './setup/db-helper.js'

describe('Agreements import', () => {
  let s3Client
  let connection

  beforeAll(async () => {
    connection = connectToTestDatbase()
    s3Client = createTestS3Client()
    await ensureBucketExists(s3Client)
    await clearTestBucket(s3Client)
  })

  test('should import agreements data and return 200 ok', async () => {
    await uploadFixtureFile(
      s3Client,
      'agreements_head.csv',
      'agreements/agreements_head.csv'
    )

    const result = await importLandData('agreements/agreements_head.csv')

    expect(result).toBe('Land data imported successfully')

    const agreements = await getRecordsByQuery(
      connection,
      'SELECT * FROM agreements WHERE sheet_id = $1 AND parcel_id = $2',
      ['SD6919', '68']
    )

    expect(agreements).toHaveLength(1)
    expect(agreements[0].sheet_id).toBe('SD6919')
    expect(agreements[0].parcel_id).toBe('68')

    const files = await listTestFiles(s3Client)
    expect(files).toHaveLength(1)
    expect(files[0]).toBe('completed/agreements/agreements_head.csv')
  }, 10000)
})
