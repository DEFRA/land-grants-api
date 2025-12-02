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

describe('Land covers import', () => {
  let s3Client
  let connection

  beforeAll(async () => {
    connection = connectToTestDatbase()
    s3Client = createTestS3Client()
    await ensureBucketExists(s3Client)
    await clearTestBucket(s3Client)
  })

  test('should import land covers data and return 200 ok', async () => {
    await uploadFixtureFile(
      s3Client,
      'covers_head.csv',
      'covers/covers_head.csv'
    )

    const result = await importLandData('covers/covers_head.csv')

    expect(result).toBe('Land data imported successfully')

    const covers = await getRecordsByQuery(
      connection,
      'SELECT * FROM land_covers WHERE sheet_id = $1 AND parcel_id = $2',
      ['TV5699', '1419']
    )

    expect(covers).toHaveLength(1)
    expect(covers[0].sheet_id).toBe('TV5699')
    expect(covers[0].parcel_id).toBe('1419')
    // expect(covers[0].area_sqm).toBe('192772.7700')

    const files = await listTestFiles(s3Client)
    expect(files).toHaveLength(1)
    expect(files[0]).toBe('completed/covers/covers_head.csv')
  }, 10000)
})
