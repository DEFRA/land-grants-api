import {
  createTestS3Client,
  uploadFixtureFile,
  uploadLandDataFixture,
  ensureBucketExists,
  listTestFiles,
  deleteFiles
} from '~/src/tests/import-tests/setup/s3-test-helpers.js'
import { importLandData } from '~/src/features/land-data-ingest/workers/ingest.module.js'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'
import { getRecordsByQuery } from '~/src/tests/import-tests/setup/db-helper.js'
import { getCsvFixtures } from '~/src/tests/import-tests/setup/csv.js'
import { S3_CONFIG } from '~/src/tests/db-tests/setup/test-config.js'
import { saveIngestStart } from '~/src/features/land-data-ingest/service/start-ingest.service.js'

const PARCELS_CSV_KEY = 'land_parcels/parcels_head.csv'
const COVERS_CSV_KEY = 'land_covers/covers_head.csv'
const PARCELS_S3_KEYS = [PARCELS_CSV_KEY, 'land_parcels/parcels_head.zip']
const COVERS_S3_KEYS = [COVERS_CSV_KEY, 'land_covers/covers_head.zip']
// land_parcels/land_covers are only promoted to their live tables together, so every test
// below that asserts against a live table must also drive a full ingest of the other side.
const ALL_S3_KEYS = [...PARCELS_S3_KEYS, ...COVERS_S3_KEYS]

/**
 * Completes a full ingest of land_parcels so it reaches `staged`, pairing it with whatever
 * land_covers ingest is currently staged (or is about to be).
 * @param {import('@aws-sdk/client-s3').S3Client} s3Client
 * @param {import('pg').Pool} connection
 * @param {object} logger
 */
async function completeParcelsPairing(s3Client, connection, logger) {
  const ingestId = await saveIngestStart(
    { files: [{ filename: 'parcels_head.csv', rows: 9 }] },
    'land_parcels',
    connection,
    logger
  )
  await uploadLandDataFixture(s3Client, 'parcels_head.csv', PARCELS_CSV_KEY)
  await importLandData({
    s3key: PARCELS_CSV_KEY,
    filename: 'parcels_head.csv',
    ingestId
  })
}

/**
 * Completes a full ingest of land_covers so it reaches `staged`, pairing it with whatever
 * land_parcels ingest is currently staged (or is about to be).
 * @param {import('@aws-sdk/client-s3').S3Client} s3Client
 * @param {import('pg').Pool} connection
 * @param {object} logger
 */
async function completeCoversPairing(s3Client, connection, logger) {
  const ingestId = await saveIngestStart(
    { files: [{ filename: 'covers_head.csv', rows: 9 }] },
    'land_covers',
    connection,
    logger
  )
  await uploadLandDataFixture(s3Client, 'covers_head.csv', COVERS_CSV_KEY)
  await importLandData({
    s3key: COVERS_CSV_KEY,
    filename: 'covers_head.csv',
    ingestId
  })
}

// Kept in the same file (rather than a separate land-covers.import.test.js) so vitest
// always runs these two describe blocks in the same worker, sequentially - land_parcels and
// land_covers ingests coordinate through shared DB state, so two files ingesting them
// concurrently in different workers would race each other.
describe('Parcels import', () => {
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
    fixtures = getCsvFixtures('parcels_head.csv')
  })

  afterAll(async () => {
    await connection.end()
    await deleteFiles(s3Client, ['land_parcels/parcels_head.csv'])
  })

  beforeEach(async () => {
    ingestId = await saveIngestStart(
      {
        files: [
          {
            filename: 'parcels_head.csv',
            rows: 9
          }
        ]
      },
      'land_parcels',
      connection,
      logger
    )
  })

  afterEach(async () => {
    await deleteFiles(s3Client, ALL_S3_KEYS)
  })

  test.each(PARCELS_S3_KEYS.map((key) => [key]))(
    'should import parcels data and return 200 ok (%s)',
    async (s3key) => {
      await uploadLandDataFixture(s3Client, 'parcels_head.csv', s3key)

      const result = await importLandData({
        s3key,
        filename: 'parcels_head.csv',
        ingestId
      })

      expect(result).toBe('Land data imported successfully')

      await completeCoversPairing(s3Client, connection, logger)

      const parcels = await getRecordsByQuery(
        connection,
        'SELECT ST_AsText(p.geom) as geom, p.sheet_id, p.parcel_id, p.area_sqm, p.ingest_date FROM land_parcels p',
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
        expect(Number(parcelResult.area_sqm)).toBe(
          Number(fixture.GEOM_AREA_SQM)
        )
        expect(parcelResult.geom).toBe(fixture.geom)
        expect(parcelResult.ingest_date).toBeDefined()
      }

      const files = await listTestFiles(s3Client)
      expect(files).toContain(s3key)
    },
    10000
  )

  test('should import parcels data as zip file', async () => {
    await uploadFixtureFile(
      s3Client,
      'parcels_head.csv.zip',
      'land_parcels/parcels_head.csv.zip',
      S3_CONFIG.bucket,
      'application/zip'
    )

    await importLandData({
      s3key: 'land_parcels/parcels_head.csv.zip',
      filename: 'parcels_head.csv',
      ingestId
    })

    await completeCoversPairing(s3Client, connection, logger)

    const parcels = await getRecordsByQuery(
      connection,
      'SELECT * FROM land_parcels WHERE sheet_id = $1 AND parcel_id = $2',
      ['TV5797', '2801']
    )

    expect(parcels).toHaveLength(1)
    expect(parcels[0].sheet_id).toBe('TV5797')
    expect(parcels[0].parcel_id).toBe('2801')
    expect(parcels[0].area_sqm).toBe('192772.7700')
    expect(parcels[0].last_updated.toISOString()).toBe(
      '2024-03-06T00:00:00.000Z'
    )
  }, 100000)
})

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
    await deleteFiles(s3Client, ALL_S3_KEYS)
  })

  test.each(COVERS_S3_KEYS.map((key) => [key]))(
    'should import land covers data and return 200 ok (%s)',
    async (s3key) => {
      await uploadLandDataFixture(s3Client, 'covers_head.csv', s3key)

      const result = await importLandData({
        s3key,
        filename: 'covers_head.csv',
        ingestId
      })

      expect(result).toBe('Land data imported successfully')

      await completeParcelsPairing(s3Client, connection, logger)

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
