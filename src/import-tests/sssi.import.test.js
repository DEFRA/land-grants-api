import {
  createTestS3Client,
  uploadFixtureFile,
  ensureBucketExists,
  deleteFiles
} from './setup/s3-test-helpers.js'

import { importLandData } from '../api/land-data-ingest/workers/ingest-schedule.module.js'
import { connectToTestDatbase } from '../db-tests/setup/postgres.js'
import { getRecordsByQuery } from './setup/db-helper.js'

describe('SSSI import', () => {
  let s3Client
  let connection

  beforeAll(async () => {
    connection = connectToTestDatbase()
    s3Client = createTestS3Client()
    await ensureBucketExists(s3Client)
  })

  afterAll(async () => {
    await connection.end()
    await deleteFiles(s3Client, ['sssi/sssi.csv'])
  })

  test('should import sssi data and return 200 ok', async () => {
    await uploadFixtureFile(s3Client, 'sssi.csv', 'sssi/sssi.csv')

    const result = await importLandData('sssi/sssi.csv')

    expect(result).toBe('Land data imported successfully')

    const allSSSI = await getRecordsByQuery(
      connection,
      'SELECT * FROM sssi',
      []
    )
    expect(allSSSI).toHaveLength(327)

    const sssi = await getRecordsByQuery(
      connection,
      'SELECT * FROM sssi WHERE sheet_id = $1 AND parcel_id = $2',
      ['NY3502', '9436']
    )
    expect(sssi).toHaveLength(1)
    expect(sssi[0].sheet_id).toBe('NY3502')
    expect(sssi[0].parcel_id).toBe('9436')
    expect(sssi[0].area_sqm).toBe('70115.9')
  }, 10000)
})
