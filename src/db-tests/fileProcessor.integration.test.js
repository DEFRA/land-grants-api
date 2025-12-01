import { connectToTestDatbase } from './setup/postgres.js'
import {
  uploadFixtureFile,
  createTestS3Client,
  ensureBucketExists,
  clearTestBucket
} from './setup/s3-test-helpers.js'
import { processFile } from '../api/land-data-ingest/service/ingest-schedule.service.js'
import { getRecord, clearTestData } from './setup/db-helper.js'

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
    const ingestId = crypto.randomUUID()
    const s3Path = `parcels/${ingestId}/parcels_head.csv`
    await uploadFixtureFile(s3Client, 'parcels_head.csv', s3Path)

    await processFile(
      s3Path,
      request,
      'land_data_ingest',
      'Parcels ingest',
      123
    )

    const parcel = await getRecord(connection, 'land_parcels', 'TV5797', '2801')
    expect(parcel.sheet_id).toBe('TV5797')
    expect(parcel.parcel_id).toBe('2801')
    expect(parcel.area_sqm).toBe('192772.7700')
    expect(parcel.ingest_id).toBe(ingestId)
  }, 30000)

  test('should ingest multiple land parcel data', async () => {
    const ingestId = crypto.randomUUID()
    const s3Path = `parcels/${ingestId}/parcels_head.csv`
    const ingestIdUpsert = crypto.randomUUID()
    const s3PathUpsert = `parcels/${ingestIdUpsert}/parcels_head_upsert.csv`

    await uploadFixtureFile(s3Client, 'parcels_head.csv', s3Path)

    await uploadFixtureFile(s3Client, 'parcels_head_upsert.csv', s3PathUpsert)

    await processFile(s3Path, request, category, title, taskId)

    await processFile(s3PathUpsert, request, category, title, taskId)

    const parcel = await getRecord(connection, 'land_parcels', 'TV5797', '2801')
    expect(parcel.sheet_id).toBe('TV5797')
    expect(parcel.parcel_id).toBe('2801')
    expect(parcel.area_sqm).toBe('182772.7700')
    expect(parcel.ingest_id).toBe(ingestIdUpsert)
  }, 30000)

  test('should ingest land cover data', async () => {
    const ingestId = crypto.randomUUID()
    const s3Path = `covers/${ingestId}/covers_head.csv`
    await uploadFixtureFile(s3Client, 'covers_head.csv', s3Path)

    await processFile(s3Path, request, category, title, taskId)

    const cover = await getRecord(connection, 'land_covers', 'TV5699', '1419')
    expect(cover.sheet_id).toBe('TV5699')
    expect(cover.parcel_id).toBe('1419')
    expect(cover.land_cover_class_code).toBe('131')
    expect(cover.ingest_id).toBe(ingestId)
  }, 30000)

  test('should ingest multiple land cover data', async () => {
    const ingestId = crypto.randomUUID()
    const s3Path = `covers/${ingestId}/covers_head.csv`
    const ingestIdUpsert = crypto.randomUUID()
    const s3PathUpsert = `covers/${ingestIdUpsert}/covers_head_upsert.csv`
    await uploadFixtureFile(s3Client, 'covers_head.csv', s3Path)

    await uploadFixtureFile(s3Client, 'covers_head_upsert.csv', s3PathUpsert)

    await processFile(s3Path, request, category, title, taskId)

    await processFile(s3PathUpsert, request, category, title, taskId)

    const cover = await getRecord(connection, 'land_covers', 'TV5699', '1419')
    expect(cover.sheet_id).toBe('TV5699')
    expect(cover.parcel_id).toBe('1419')
    expect(cover.land_cover_class_code).toBe('132')
  }, 30000)

  test('should ingest agreement data', async () => {
    await uploadFixtureFile(
      s3Client,
      'agreements.csv',
      'agreements/agreements.csv'
    )

    await processFile(
      'agreements/agreements.csv',
      request,
      category,
      title,
      taskId
    )

    const cover = await getRecord(connection, 'agreements', 'NY7052', '78')
    expect(cover.actions).toEqual([
      {
        actionCode: 'WD9',
        unit: 'ha',
        quantity: 3,
        startDate: '1/1/23 0:00',
        endDate: '12/31/27 0:00'
      }
    ])

    const cover2 = await getRecord(connection, 'agreements', 'SD6919', '68')
    expect(cover2.actions).toEqual([
      {
        actionCode: 'CMOR1',
        unit: 'ha',
        quantity: 0.8617,
        startDate: '1/1/25 0:00',
        endDate: '12/31/27 0:00'
      },
      {
        actionCode: 'UPL8',
        unit: 'ha',
        quantity: 0.8617,
        startDate: '1/1/25 0:00',
        endDate: '12/31/27 0:00'
      }
    ])

    const cover3 = await getRecord(connection, 'agreements', 'SD8645', '30')
    expect(cover3).toBeNull()
  }, 30000)
})
