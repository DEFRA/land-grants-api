import { connectToTestDatbase } from './setup/postgres.js'
import {
  uploadFixtureFile,
  createTestS3Client,
  ensureBucketExists,
  clearTestBucket
} from './setup/s3-test-helpers.js'
import { processFile } from '../api/land-data-ingest/service/ingest-schedule.service.js'
import {
  getRecord,
  clearTestData,
  getMoorlandRecord
} from './setup/db-helper.js'

const logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}

const category = 'land_data_ingest'
const title = 'Land data ingest'
const taskId = 123
let connection
let s3Client

describe('Land data ingest file processor integration test', () => {
  beforeAll(async () => {
    connection = connectToTestDatbase()
    s3Client = createTestS3Client()
    await ensureBucketExists(s3Client)
  })

  afterAll(async () => {
    await connection.end()
  })

  afterEach(async () => {
    await clearTestBucket(s3Client)
    await clearTestData(connection)
  })

  const request = {
    server: {
      s3: s3Client
    },
    logger
  }
  // covers_head: TV5699,1419
  // parcels_head: TV5797,2801
  // parcels_1head: TV5797,2801
  // moorland lfa_moor_id: 735

  test('should ingest land parcel data', async () => {
    await uploadFixtureFile(
      s3Client,
      'parcels_head.csv',
      'parcels/parcels_head.csv'
    )

    await processFile(
      'parcels/parcels_head.csv',
      request,
      'land_data_ingest',
      'Parcels ingest',
      123
    )

    const parcel = await getRecord(connection, 'land_parcels', 'TV5797', '2801')
    expect(parcel.sheet_id).toBe('TV5797')
    expect(parcel.parcel_id).toBe('2801')
    expect(parcel.area_sqm).toBe('192772.7700')
  }, 30000)

  test('should ingest multiple land parcel data', async () => {
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

    await processFile(
      'parcels/parcels_head.csv',
      request,
      category,
      title,
      taskId
    )

    await processFile(
      'parcels/parcels_head_upsert.csv',
      request,
      category,
      title,
      taskId
    )

    const parcel = await getRecord(connection, 'land_parcels', 'TV5797', '2801')
    expect(parcel.sheet_id).toBe('TV5797')
    expect(parcel.parcel_id).toBe('2801')
    expect(parcel.area_sqm).toBe('182772.7700')
  }, 30000)

  test('should ingest land cover data', async () => {
    await uploadFixtureFile(
      s3Client,
      'covers_head.csv',
      'covers/covers_head.csv'
    )

    await processFile(
      'covers/covers_head.csv',
      request,
      category,
      title,
      taskId
    )

    const cover = await getRecord(connection, 'land_covers', 'TV5699', '1419')
    expect(cover.sheet_id).toBe('TV5699')
    expect(cover.parcel_id).toBe('1419')
    expect(cover.land_cover_class_code).toBe('131')
  }, 30000)

  test('should ingest multiple land cover data', async () => {
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

    await processFile(
      'covers/covers_head.csv',
      request,
      category,
      title,
      taskId
    )

    await processFile(
      'covers/covers_head_upsert.csv',
      request,
      category,
      title,
      taskId
    )

    const cover = await getRecord(connection, 'land_covers', 'TV5699', '1419')
    expect(cover.sheet_id).toBe('TV5699')
    expect(cover.parcel_id).toBe('1419')
    expect(cover.land_cover_class_code).toBe('132')
  }, 30000)

  test('should ingest moorland designations data', async () => {
    await uploadFixtureFile(
      s3Client,
      'moorland_head.csv',
      'moorland/moorland_head.csv'
    )

    await processFile(
      'moorland/moorland_head.csv',
      request,
      category,
      title,
      taskId
    )

    const moorland = await getMoorlandRecord(connection, 735)
    expect(moorland.lfa_moor_id).toBe('735')
    expect(moorland.ref_code).toBe('MS')
  }, 30000)
})
