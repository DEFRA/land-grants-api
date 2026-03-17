import {
  createTestS3Client,
  uploadFixtureFile,
  uploadLandDataFixture,
  ensureBucketExists,
  listTestFiles,
  deleteFiles
} from '~/src/tests/import-tests/setup/s3-test-helpers.js'

import { importLandData } from '~/src/features/land-data-ingest/workers/ingest.module.js'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'
import { getRecordsByQuery } from '~/src/tests/import-tests/setup/db-helper.js'
import { getCsvFixtures } from '~/src/tests/import-tests/setup/csv.js'

const S3_KEYS = [
  'moorland_designations/moorland_head.csv',
  'moorland_designations/moorland_head.zip'
]

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
      'moorland_designations/moorland_head_upsert.csv'
    ])
  })

  afterEach(async () => {
    await deleteFiles(s3Client, S3_KEYS)
  })

  test.each(S3_KEYS.map((key) => [key]))(
    'should import moorland data and return 200 ok (%s)',
    async (s3Key) => {
      await uploadLandDataFixture(s3Client, 'moorland_head.csv', s3Key)

      const result = await importLandData(s3Key)

      expect(result).toBe('Land data imported successfully')

      const allMoorlandDesignations = await getRecordsByQuery(
        connection,
        'SELECT name, source_id, ST_AsText(geom) as geom, metadata FROM data_layer WHERE data_layer_type_id = 2',
        []
      )

      for (const fixture of fixtures) {
        const moorlandResult = allMoorlandDesignations.find(
          (m) => m.source_id === fixture.OBJECTID
        )
        expect(moorlandResult.name).toEqual(fixture.NAME)
        expect(moorlandResult.geom).toEqual(fixture.geom)
        expect(moorlandResult.metadata).toEqual({
          ref_code: fixture.REF_CODE,
          lfamoorid: Number(fixture.LFAMOORID)
        })
      }

      const files = await listTestFiles(s3Client)
      expect(files).toContain(s3Key)
    },
    10000
  )

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

    const [moorland] = await getRecordsByQuery(
      connection,
      'SELECT id, source_id, name, metadata FROM data_layer where source_id = $1',
      ['9']
    )

    expect(moorland.name).toBe('MS1')
    expect(moorland.metadata).toEqual({
      ref_code: 'MS1',
      lfamoorid: 735
    })
    expect(moorland.source_id).toBe('9')
  }, 10000)
})
