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

describe('Moorland import', () => {
  let s3Client
  let connection
  let fixtures

  beforeAll(async () => {
    connection = connectToTestDatbase()
    s3Client = createTestS3Client()
    await ensureBucketExists(s3Client)
    await clearTestBucket(s3Client)
    fixtures = getCsvFixtures('moorland_head.csv')
  })

  afterAll(async () => {
    await connection.end()
  })

  test('should import moorland data and return 200 ok', async () => {
    await uploadFixtureFile(
      s3Client,
      'moorland_head.csv',
      'moorland/moorland_head.csv'
    )

    const result = await importLandData('moorland/moorland_head.csv')

    expect(result).toBe('Land data imported successfully')

    const moorland = await getRecordsByQuery(
      connection,
      'SELECT ST_AsText(m.geom) as geom, m.lfa_moor_id, m.name, m.ref_code FROM moorland_designations m',
      []
    )

    for (const fixture of fixtures) {
      const moorlandResult = moorland.find(
        (m) => m.lfa_moor_id === fixture.LFAMOORID
      )

      expect(moorlandResult.lfa_moor_id).toEqual(fixture.LFAMOORID)
      expect(moorlandResult.ref_code).toEqual(fixture.REF_CODE)
      expect(moorlandResult.name).toEqual(fixture.NAME)
      expect(moorlandResult.geom).toEqual(fixture.geom)
    }

    const files = await listTestFiles(s3Client)
    expect(files).toHaveLength(1)
    expect(files[0]).toBe('moorland/moorland_head.csv')
  }, 10000)
})
