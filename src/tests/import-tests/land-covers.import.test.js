import {
  createTestS3Client,
  uploadLandDataFixture,
  ensureBucketExists,
  listTestFiles,
  deleteFiles
} from '~/src/tests/import-tests/setup/s3-test-helpers.js'

import { importLandData } from '~/src/features/land-data-ingest/workers/ingest.module.js'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'
import { getRecordsByQuery } from '~/src/tests/import-tests/setup/db-helper.js'
import { getCsvFixtures } from '~/src/tests/import-tests/setup/csv.js'
import { saveIngestStart } from '~/src/features/land-data-ingest/service/start-ingest.service.js'

const S3_KEYS = ['land_covers/covers_head.csv', 'land_covers/covers_head.zip']

describe('Land covers import', () => {
  let s3Client
  let connection
  let fixtures
  let ingestId
  const logger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }

  beforeAll(async () => {
    connection = connectToTestDatabase()
    s3Client = createTestS3Client()
    await ensureBucketExists(s3Client)
    fixtures = getCsvFixtures('covers_head.csv')
  })

  afterAll(async () => {
    await connection.end()
    await deleteFiles(s3Client, ['land_covers/covers_head.csv'])
  })

  beforeEach(async () => {
    ingestId = await saveIngestStart(
      {
        files: [
          {
            filename: 'covers_head.csv',
            rows: 9
          }
        ]
      },
      'land_covers',
      connection,
      logger
    )
  })

  afterEach(async () => {
    await deleteFiles(s3Client, S3_KEYS)
  })

  test.each(S3_KEYS.map((key) => [key]))(
    'should import land covers data and return 200 ok (%s)',
    async (s3key) => {
      await uploadLandDataFixture(s3Client, 'covers_head.csv', s3key)

      const result = await importLandData({
        s3key,
        filename: 'covers_head.csv',
        ingestId
      })

      expect(result).toBe('Land data imported successfully')

      for (const fixture of fixtures) {
        const [coverResult] = await getRecordsByQuery(
          connection,
          'SELECT id, ST_AsText(c.geom) as geom, c.sheet_id, c.parcel_id, c.land_cover_class_code, c.is_linear_feature, c.last_updated, c.ingest_date FROM land_covers c where c.id = $1',
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
        expect(coverResult.ingest_date).toBeDefined()
      }

      const files = await listTestFiles(s3Client)
      expect(files).toContain(s3key)
    },
    10000
  )
})
