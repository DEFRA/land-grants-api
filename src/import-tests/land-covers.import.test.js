import {
  createTestS3Client,
  uploadFixtureFile,
  ensureBucketExists,
  listTestFiles,
  deleteFiles
} from './setup/s3-test-helpers.js'

import { importLandData } from '../api/land-data-ingest/workers/ingest-schedule.module.js'
import { connectToTestDatbase } from '../db-tests/setup/postgres.js'
import { getRecordsByQuery } from './setup/db-helper.js'
import { getCsvFixtures } from './setup/csv.js'

describe('Land covers import', () => {
  let s3Client
  let connection
  let fixtures

  beforeAll(async () => {
    connection = connectToTestDatbase()
    s3Client = createTestS3Client()
    await ensureBucketExists(s3Client)
    fixtures = getCsvFixtures('covers_head.csv')
  })

  afterAll(async () => {
    await connection.end()
  })

  afterEach(async () => {
    await deleteFiles(s3Client, ['covers/covers_head.csv'])
  })

  test('should import land covers data and return 200 ok', async () => {
    await uploadFixtureFile(
      s3Client,
      'covers_head.csv',
      'covers/covers_head.csv'
    )

    const result = await importLandData('covers/covers_head.csv')

    expect(result).toBe('Land data imported successfully')

    for (const fixture of fixtures) {
      const [coverResult] = await getRecordsByQuery(
        connection,
        'SELECT id, ST_AsText(c.geom) as geom, c.sheet_id, c.parcel_id, c.land_cover_class_code, c.is_linear_feature, c.last_updated FROM land_covers c where c.id = $1',
        [fixture.ID]
      )

      expect(coverResult.sheet_id).toBe(fixture.SHEET_ID)
      expect(coverResult.parcel_id).toBe(fixture.PARCEL_ID)
      expect(coverResult.land_cover_class_code).toBe(
        fixture.LAND_COVER_CLASS_CODE
      )
      expect(coverResult.is_linear_feature ? 'Y' : 'N').toBe(
        fixture.LINEAR_FEATURE
      )
      expect(coverResult.last_updated).toBeDefined()
      expect(coverResult.geom).toBe(fixture.geom)
    }

    const files = await listTestFiles(s3Client)
    expect(files[0]).toBe('covers/covers_head.csv')
  }, 10000)

  test('should import land covers data and upsert data', async () => {
    await uploadFixtureFile(
      s3Client,
      'covers_head.csv',
      'covers/covers_head.csv'
    )
    await uploadFixtureFile(
      s3Client,
      'covers_head_upsert.csv',
      'covers/covers_head_upsert.csv'
    )

    await importLandData('covers/covers_head.csv')
    await importLandData('covers/covers_head_upsert.csv')

    const covers = await getRecordsByQuery(
      connection,
      'SELECT * FROM land_covers WHERE id = $1',
      ['20']
    )

    expect(covers).toHaveLength(1)
    expect(covers[0].sheet_id).toBe('TV5699')
    expect(covers[0].parcel_id).toBe('1419')
    expect(covers[0].land_cover_class_code).toBe('132')
  }, 10000)
})
