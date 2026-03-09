import {
  createTestS3Client,
  uploadLandDataFixture,
  ensureBucketExists,
  deleteFiles
} from '~/src/tests/import-tests/setup/s3-test-helpers.js'

import { importLandData } from '~/src/features/land-data-ingest/workers/ingest.module.js'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'
import { getRecordsByQuery } from '~/src/tests/import-tests/setup/db-helper.js'

const S3_KEYS = [
  'registered_parks_gardens/registered_parks_gardens.csv',
  'registered_parks_gardens/registered_parks_gardens.zip'
]

describe('Registered parks and gardens import', () => {
  let s3Client
  let connection

  beforeAll(async () => {
    connection = connectToTestDatbase()
    s3Client = createTestS3Client()
    await ensureBucketExists(s3Client)
  })

  afterAll(async () => {
    await connection.end()
  })

  afterEach(async () => {
    await deleteFiles(s3Client, S3_KEYS)
  })

  test.each(S3_KEYS.map((key) => [key]))(
    'should import registered parks and gardens data and return 200 ok (%s)',
    async (s3Key) => {
      await uploadLandDataFixture(
        s3Client,
        'registered_parks_gardens_head.csv',
        s3Key
      )

      const result = await importLandData(s3Key)

      expect(result).toBe('Land data imported successfully')

      const allParksGardens = await getRecordsByQuery(
        connection,
        "SELECT * FROM data_layer WHERE data_layer_type_id = 3 and metadata->>'type' = 'registered_parks_gardens';",
        []
      )
      expect(allParksGardens).toHaveLength(2)

      const parkGarden = allParksGardens.find((p) => p.source_id === '1000108')
      expect(parkGarden.name).toBe('HAMPTON COURT')
      expect(parkGarden.metadata).toEqual({
        grade: 'I',
        area_ha: 289.590371746925,
        ngr: 'TQ 16570 68051',
        hyperlink:
          'https://historicengland.org.uk/listing/the-list/list-entry/1000108',
        reg_date: '1987/10/01 00:00:00+00',
        amend_date: null,
        capture_scale: '1:10000',
        type: 'registered_parks_gardens'
      })
      expect(parkGarden.data_layer_type_id).toBe(3)
      expect(parkGarden.last_updated).toBeDefined()
      expect(parkGarden.ingest_date).toBeDefined()
      expect(parkGarden.ingest_id).toBeDefined()
      expect(parkGarden.geom).toBeDefined()
    },
    10000
  )
})
