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

describe('Parcels import', () => {
  let s3Client
  let connection

  beforeAll(async () => {
    connection = connectToTestDatbase()
    s3Client = createTestS3Client()
    await ensureBucketExists(s3Client)
    await clearTestBucket(s3Client)
  })

  test('should import parcels data and return 200 ok', async () => {
    await uploadFixtureFile(
      s3Client,
      'parcels_head.csv',
      'parcels/parcels_head.csv'
    )

    const result = await importLandData('parcels/parcels_head.csv')

    expect(result).toBe('Land data imported successfully')

    const parcels = await getRecordsByQuery(
      connection,
      'SELECT * FROM land_parcels WHERE sheet_id = $1 AND parcel_id = $2',
      ['TV5797', '2801']
    )

    expect(parcels).toHaveLength(1)
    expect(parcels[0].sheet_id).toBe('TV5797')
    expect(parcels[0].parcel_id).toBe('2801')
    expect(parcels[0].area_sqm).toBe('192772.7700')

    const files = await listTestFiles(s3Client)
    expect(files).toHaveLength(1)
    expect(files[0]).toBe('completed/parcels/parcels_head.csv')
  }, 10000)

  test('should import parcels data and upsert data', async () => {
    await uploadFixtureFile(
      s3Client,
      'parcels_head.csv',
      'parcels/parcels_head.csv'
    )
    await uploadFixtureFile(
      s3Client,
      'parcels_head_upsert.csv',
      'parcels/parcels_head_upsert.csv'
    )

    await importLandData('parcels/parcels_head.csv')
    await importLandData('parcels/parcels_head_upsert.csv')

    const parcels = await getRecordsByQuery(
      connection,
      'SELECT * FROM land_parcels WHERE sheet_id = $1 AND parcel_id = $2',
      ['TV5797', '2801']
    )

    expect(parcels).toHaveLength(1)
    expect(parcels[0].sheet_id).toBe('TV5797')
    expect(parcels[0].parcel_id).toBe('2801')
    expect(parcels[0].area_sqm).toBe('182772.7700')
  }, 10000)
})
