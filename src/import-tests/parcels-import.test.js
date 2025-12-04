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
import { getCsvFixtures } from './setup/csv.js'

describe('Parcels import', () => {
  let s3Client
  let connection
  let fixtures

  beforeAll(async () => {
    connection = connectToTestDatbase()
    s3Client = createTestS3Client()
    await ensureBucketExists(s3Client)
    await clearTestBucket(s3Client)
    fixtures = getCsvFixtures('parcels_head.csv')
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
      'SELECT ST_AsText(p.geom) as geom, p.sheet_id, p.parcel_id, p.area_sqm FROM land_parcels p',
      []
    )

    for (const fixture of fixtures) {
      const parcelResult = parcels.find(
        (p) =>
          p.sheet_id === fixture.SHEET_ID && p.parcel_id === fixture.PARCEL_ID
      )

      expect(parcelResult).toBeDefined()
      expect(parcelResult.sheet_id).toBe(fixture.SHEET_ID)
      expect(parcelResult.parcel_id).toBe(fixture.PARCEL_ID)
      expect(Number(parcelResult.area_sqm)).toBe(Number(fixture.GEOM_AREA_SQM))
      expect(parcelResult.geom).toBe(fixture.geom)
    }

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
