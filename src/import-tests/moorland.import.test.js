import {
  createTestS3Client,
  uploadFixtureFile,
  ensureBucketExists,
  listTestFiles,
  deleteFiles
} from './setup/s3-test-helpers.js'

import { importLandData } from '../api/land-data-ingest/workers/ingest.module.js'
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
    fixtures = getCsvFixtures('moorland_head.csv')
  })

  afterAll(async () => {
    await connection.end()
    await deleteFiles(s3Client, [
      'moorland/moorland_head.csv',
      'moorland_designations/moorland_head_upsert.csv'
    ])
  })

  test('should import moorland data and return 200 ok', async () => {
    await uploadFixtureFile(
      s3Client,
      'moorland_head.csv',
      'moorland_designations/moorland_head.csv'
    )

    const result = await importLandData(
      'moorland_designations/moorland_head.csv'
    )

    expect(result).toBe('Land data imported successfully')

    const moorland = await getRecordsByQuery(
      connection,
      'SELECT id, ST_AsText(m.geom) as geom, m.lfa_moor_id, m.name, m.ref_code FROM moorland_designations m',
      []
    )

    for (const fixture of fixtures) {
      const moorlandResult = moorland.find(
        (m) => m.id === Number(fixture.OBJECTID)
      )

      expect(moorlandResult.lfa_moor_id).toEqual(fixture.LFAMOORID)
      expect(moorlandResult.ref_code).toEqual(fixture.REF_CODE)
      expect(moorlandResult.name).toEqual(fixture.NAME)
      expect(moorlandResult.geom).toEqual(fixture.geom)
    }

    const files = await listTestFiles(s3Client)
    expect(files).toContain('moorland_designations/moorland_head.csv')
  }, 10000)

  test('should import moorland and upsert data', async () => {
    await uploadFixtureFile(
      s3Client,
      'moorland_head.csv',
      'moorland_designations/moorland_head.csv'
    )
    await uploadFixtureFile(
      s3Client,
      'moorland_head_upsert.csv',
      'moorland_designations/moorland_head_upsert.csv'
    )

    await importLandData('moorland_designations/moorland_head.csv')
    await importLandData('moorland_designations/moorland_head_upsert.csv')

    const moorland = await getRecordsByQuery(
      connection,
      'SELECT id, ST_AsText(m.geom) as geom, m.lfa_moor_id, m.name, m.ref_code FROM moorland_designations m where id = $1',
      [9]
    )

    expect(moorland[0].lfa_moor_id).toBe('735')
    expect(moorland[0].ref_code).toBe('MS1')
    expect(moorland[0].name).toBe('MS1')
  }, 10000)
})
