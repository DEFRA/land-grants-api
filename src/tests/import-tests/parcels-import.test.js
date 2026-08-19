import {
  createTestS3Client,
  uploadFixtureFile,
  uploadLandDataFixture,
  ensureBucketExists,
  listTestFiles,
  deleteFiles
} from '~/src/tests/import-tests/setup/s3-test-helpers.js'
import { importLandData } from '~/src/features/land-data-ingest/workers/import-land-data.js'
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

      expect(result).toEqual({
        message: 'Land data imported successfully',
        dataChanged: false
      })

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

      expect(result).toEqual({
        message: 'Land data imported successfully',
        dataChanged: false
      })

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

describe('Land import pairing scoping', () => {
  let s3Client
  let connection
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
  })

  afterAll(async () => {
    await connection.end()
    await deleteFiles(s3Client, ALL_S3_KEYS)
  })

  test('does not pair today with a staged covers ingest left over from yesterday', async () => {
    // Remove ingest history left by earlier tests so the leftover is the most recent
    // land_covers ingest (as it would be at the start of a brand new day).
    await connection.query(
      `DELETE FROM ingest_files WHERE ingest_id IN (SELECT id FROM ingest WHERE entity = ANY($1))`,
      [['land_parcels', 'land_covers']]
    )
    await connection.query(`DELETE FROM ingest WHERE entity = ANY($1)`, [
      ['land_parcels', 'land_covers']
    ])

    // Yesterday's land_covers run finished staging but was never promoted.
    const leftoverCoversIngestId = await saveIngestStart(
      { files: [{ filename: 'covers_head.csv', rows: 9 }] },
      'land_covers',
      connection,
      logger
    )
    await uploadLandDataFixture(s3Client, 'covers_head.csv', COVERS_CSV_KEY)
    await importLandData({
      s3key: COVERS_CSV_KEY,
      filename: 'covers_head.csv',
      ingestId: leftoverCoversIngestId
    })
    await connection.query(
      `UPDATE ingest SET start_date = start_date - interval '1 day' WHERE id = $1`,
      [leftoverCoversIngestId]
    )

    // Today's land_parcels run completes. It must wait for today's land_covers run
    // rather than promoting against yesterday's leftover covers data.
    const parcelsIngestId = await saveIngestStart(
      { files: [{ filename: 'parcels_head.csv', rows: 9 }] },
      'land_parcels',
      connection,
      logger
    )
    await uploadLandDataFixture(s3Client, 'parcels_head.csv', PARCELS_CSV_KEY)
    await importLandData({
      s3key: PARCELS_CSV_KEY,
      filename: 'parcels_head.csv',
      ingestId: parcelsIngestId
    })

    const [parcelsIngest] = await getRecordsByQuery(
      connection,
      `SELECT status FROM ingest WHERE id = $1`,
      [parcelsIngestId]
    )
    const [leftoverCovers] = await getRecordsByQuery(
      connection,
      `SELECT status FROM ingest WHERE id = $1`,
      [leftoverCoversIngestId]
    )

    expect(parcelsIngest.status).toBe('staged')
    expect(leftoverCovers.status).toBe('staged')

    // Today's land_covers run completes and pairs with today's parcels run.
    const coversIngestId = await saveIngestStart(
      { files: [{ filename: 'covers_head.csv', rows: 9 }] },
      'land_covers',
      connection,
      logger
    )
    await uploadLandDataFixture(s3Client, 'covers_head.csv', COVERS_CSV_KEY)
    await importLandData({
      s3key: COVERS_CSV_KEY,
      filename: 'covers_head.csv',
      ingestId: coversIngestId
    })

    const [coversIngest] = await getRecordsByQuery(
      connection,
      `SELECT status FROM ingest WHERE id = $1`,
      [coversIngestId]
    )
    const [promotedParcels] = await getRecordsByQuery(
      connection,
      `SELECT status FROM ingest WHERE id = $1`,
      [parcelsIngestId]
    )
    const [cancelledLeftoverCovers] = await getRecordsByQuery(
      connection,
      `SELECT status FROM ingest WHERE id = $1`,
      [leftoverCoversIngestId]
    )

    expect(coversIngest.status).toBe('completed')
    expect(promotedParcels.status).toBe('completed')
    expect(cancelledLeftoverCovers.status).toBe('cancelled')
  })

  test('aborts the paired promotion when the covers staging references parcels missing from the parcels staging', async () => {
    await connection.query(
      `DELETE FROM ingest_files WHERE ingest_id IN (SELECT id FROM ingest WHERE entity = ANY($1))`,
      [['land_parcels', 'land_covers']]
    )
    await connection.query(`DELETE FROM ingest WHERE entity = ANY($1)`, [
      ['land_parcels', 'land_covers']
    ])

    const [liveParcelsBefore] = await getRecordsByQuery(
      connection,
      `SELECT COUNT(*) AS count FROM land_parcels`
    )
    const [liveCoversBefore] = await getRecordsByQuery(
      connection,
      `SELECT COUNT(*) AS count FROM land_covers`
    )

    const parcelsIngestId = await saveIngestStart(
      { files: [{ filename: 'parcels_head.csv', rows: 9 }] },
      'land_parcels',
      connection,
      logger
    )
    await uploadLandDataFixture(s3Client, 'parcels_head.csv', PARCELS_CSV_KEY)
    await importLandData({
      s3key: PARCELS_CSV_KEY,
      filename: 'parcels_head.csv',
      ingestId: parcelsIngestId
    })

    // Remove most of the staged parcels so the staged covers would reference parcels that
    // are no longer in the parcels staging - the promotion must abort before touching live
    // tables rather than leave unlinked covers.
    await connection.query(
      `DELETE FROM land_parcels_staging WHERE parcel_id IN (SELECT parcel_id FROM land_parcels_staging LIMIT 5)`
    )

    const coversIngestId = await saveIngestStart(
      { files: [{ filename: 'covers_head.csv', rows: 9 }] },
      'land_covers',
      connection,
      logger
    )
    await uploadLandDataFixture(s3Client, 'covers_head.csv', COVERS_CSV_KEY)

    await expect(
      importLandData({
        s3key: COVERS_CSV_KEY,
        filename: 'covers_head.csv',
        ingestId: coversIngestId
      })
    ).rejects.toThrow(
      'land_covers/land_parcels cannot be promoted because the covers staging table references 5 parcels that are not in the parcels staging table'
    )

    const [parcelsIngest] = await getRecordsByQuery(
      connection,
      `SELECT status FROM ingest WHERE id = $1`,
      [parcelsIngestId]
    )
    const [coversIngest] = await getRecordsByQuery(
      connection,
      `SELECT status FROM ingest WHERE id = $1`,
      [coversIngestId]
    )
    const [liveParcelsAfter] = await getRecordsByQuery(
      connection,
      `SELECT COUNT(*) AS count FROM land_parcels`
    )
    const [liveCoversAfter] = await getRecordsByQuery(
      connection,
      `SELECT COUNT(*) AS count FROM land_covers`
    )

    expect(parcelsIngest.status).toBe('failed')
    expect(coversIngest.status).toBe('failed')
    expect(liveParcelsAfter.count).toBe(liveParcelsBefore.count)
    expect(liveCoversAfter.count).toBe(liveCoversBefore.count)
  })

  test('aborts the paired promotion when the unique parcel counts do not match between the staging tables', async () => {
    await connection.query(
      `DELETE FROM ingest_files WHERE ingest_id IN (SELECT id FROM ingest WHERE entity = ANY($1))`,
      [['land_parcels', 'land_covers']]
    )
    await connection.query(`DELETE FROM ingest WHERE entity = ANY($1)`, [
      ['land_parcels', 'land_covers']
    ])

    const [liveParcelsBefore] = await getRecordsByQuery(
      connection,
      `SELECT COUNT(*) AS count FROM land_parcels`
    )
    const [liveCoversBefore] = await getRecordsByQuery(
      connection,
      `SELECT COUNT(*) AS count FROM land_covers`
    )

    const coversIngestId = await saveIngestStart(
      { files: [{ filename: 'covers_head.csv', rows: 9 }] },
      'land_covers',
      connection,
      logger
    )
    await uploadLandDataFixture(s3Client, 'covers_head.csv', COVERS_CSV_KEY)
    await importLandData({
      s3key: COVERS_CSV_KEY,
      filename: 'covers_head.csv',
      ingestId: coversIngestId
    })

    // Remove some of the staged covers so the parcels staging would hold more unique parcels
    // than the covers staging - the promotion must abort before touching live tables rather
    // than promote parcels that have no covers.
    await connection.query(
      `DELETE FROM land_covers_staging WHERE parcel_id IN (SELECT parcel_id FROM land_covers_staging LIMIT 2)`
    )

    const parcelsIngestId = await saveIngestStart(
      { files: [{ filename: 'parcels_head.csv', rows: 9 }] },
      'land_parcels',
      connection,
      logger
    )
    await uploadLandDataFixture(s3Client, 'parcels_head.csv', PARCELS_CSV_KEY)

    await expect(
      importLandData({
        s3key: PARCELS_CSV_KEY,
        filename: 'parcels_head.csv',
        ingestId: parcelsIngestId
      })
    ).rejects.toThrow(
      'land_parcels/land_covers cannot be promoted because parcel count (9) was not equal to cover count (7)'
    )

    const [parcelsIngest] = await getRecordsByQuery(
      connection,
      `SELECT status FROM ingest WHERE id = $1`,
      [parcelsIngestId]
    )
    const [coversIngest] = await getRecordsByQuery(
      connection,
      `SELECT status FROM ingest WHERE id = $1`,
      [coversIngestId]
    )
    const [liveParcelsAfter] = await getRecordsByQuery(
      connection,
      `SELECT COUNT(*) AS count FROM land_parcels`
    )
    const [liveCoversAfter] = await getRecordsByQuery(
      connection,
      `SELECT COUNT(*) AS count FROM land_covers`
    )

    expect(parcelsIngest.status).toBe('failed')
    expect(coversIngest.status).toBe('failed')
    expect(liveParcelsAfter.count).toBe(liveParcelsBefore.count)
    expect(liveCoversAfter.count).toBe(liveCoversBefore.count)
  })

  test('aborts the paired promotion when the parcels staging table is empty', async () => {
    await connection.query(
      `DELETE FROM ingest_files WHERE ingest_id IN (SELECT id FROM ingest WHERE entity = ANY($1))`,
      [['land_parcels', 'land_covers']]
    )
    await connection.query(`DELETE FROM ingest WHERE entity = ANY($1)`, [
      ['land_parcels', 'land_covers']
    ])

    const [liveParcelsBefore] = await getRecordsByQuery(
      connection,
      `SELECT COUNT(*) AS count FROM land_parcels`
    )
    const [liveCoversBefore] = await getRecordsByQuery(
      connection,
      `SELECT COUNT(*) AS count FROM land_covers`
    )

    const parcelsIngestId = await saveIngestStart(
      { files: [{ filename: 'parcels_head.csv', rows: 9 }] },
      'land_parcels',
      connection,
      logger
    )
    await uploadLandDataFixture(s3Client, 'parcels_head.csv', PARCELS_CSV_KEY)
    await importLandData({
      s3key: PARCELS_CSV_KEY,
      filename: 'parcels_head.csv',
      ingestId: parcelsIngestId
    })

    // Empty the parcels staging after it staged so the promotion must abort rather than
    // swap an empty table into live (which would wipe the live land_parcels table).
    await connection.query(`DELETE FROM land_parcels_staging`)

    const coversIngestId = await saveIngestStart(
      { files: [{ filename: 'covers_head.csv', rows: 9 }] },
      'land_covers',
      connection,
      logger
    )
    await uploadLandDataFixture(s3Client, 'covers_head.csv', COVERS_CSV_KEY)

    await expect(
      importLandData({
        s3key: COVERS_CSV_KEY,
        filename: 'covers_head.csv',
        ingestId: coversIngestId
      })
    ).rejects.toThrow(
      'land_covers/land_parcels cannot be promoted because a staging table is empty'
    )

    const [parcelsIngest] = await getRecordsByQuery(
      connection,
      `SELECT status FROM ingest WHERE id = $1`,
      [parcelsIngestId]
    )
    const [coversIngest] = await getRecordsByQuery(
      connection,
      `SELECT status FROM ingest WHERE id = $1`,
      [coversIngestId]
    )
    const [liveParcelsAfter] = await getRecordsByQuery(
      connection,
      `SELECT COUNT(*) AS count FROM land_parcels`
    )
    const [liveCoversAfter] = await getRecordsByQuery(
      connection,
      `SELECT COUNT(*) AS count FROM land_covers`
    )

    expect(parcelsIngest.status).toBe('failed')
    expect(coversIngest.status).toBe('failed')
    expect(liveParcelsAfter.count).toBe(liveParcelsBefore.count)
    expect(liveCoversAfter.count).toBe(liveCoversBefore.count)
  })

  test('aborts the paired promotion when the covers staging table is empty', async () => {
    await connection.query(
      `DELETE FROM ingest_files WHERE ingest_id IN (SELECT id FROM ingest WHERE entity = ANY($1))`,
      [['land_parcels', 'land_covers']]
    )
    await connection.query(`DELETE FROM ingest WHERE entity = ANY($1)`, [
      ['land_parcels', 'land_covers']
    ])

    const [liveParcelsBefore] = await getRecordsByQuery(
      connection,
      `SELECT COUNT(*) AS count FROM land_parcels`
    )
    const [liveCoversBefore] = await getRecordsByQuery(
      connection,
      `SELECT COUNT(*) AS count FROM land_covers`
    )

    const coversIngestId = await saveIngestStart(
      { files: [{ filename: 'covers_head.csv', rows: 9 }] },
      'land_covers',
      connection,
      logger
    )
    await uploadLandDataFixture(s3Client, 'covers_head.csv', COVERS_CSV_KEY)
    await importLandData({
      s3key: COVERS_CSV_KEY,
      filename: 'covers_head.csv',
      ingestId: coversIngestId
    })

    // Empty the covers staging after it staged so the promotion must abort rather than
    // swap an empty table into live (which would wipe the live land_covers table).
    await connection.query(`DELETE FROM land_covers_staging`)

    const parcelsIngestId = await saveIngestStart(
      { files: [{ filename: 'parcels_head.csv', rows: 9 }] },
      'land_parcels',
      connection,
      logger
    )
    await uploadLandDataFixture(s3Client, 'parcels_head.csv', PARCELS_CSV_KEY)

    await expect(
      importLandData({
        s3key: PARCELS_CSV_KEY,
        filename: 'parcels_head.csv',
        ingestId: parcelsIngestId
      })
    ).rejects.toThrow(
      'land_parcels/land_covers cannot be promoted because a staging table is empty'
    )

    const [parcelsIngest] = await getRecordsByQuery(
      connection,
      `SELECT status FROM ingest WHERE id = $1`,
      [parcelsIngestId]
    )
    const [coversIngest] = await getRecordsByQuery(
      connection,
      `SELECT status FROM ingest WHERE id = $1`,
      [coversIngestId]
    )
    const [liveParcelsAfter] = await getRecordsByQuery(
      connection,
      `SELECT COUNT(*) AS count FROM land_parcels`
    )
    const [liveCoversAfter] = await getRecordsByQuery(
      connection,
      `SELECT COUNT(*) AS count FROM land_covers`
    )

    expect(parcelsIngest.status).toBe('failed')
    expect(coversIngest.status).toBe('failed')
    expect(liveParcelsAfter.count).toBe(liveParcelsBefore.count)
    expect(liveCoversAfter.count).toBe(liveCoversBefore.count)
  })
})
