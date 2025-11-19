import { connectToTestDatbase } from './setup/postgres.js'
import {
  uploadFixtureFile,
  createTestS3Client,
  ensureBucketExists,
  clearTestBucket
} from './setup/s3-test-helpers.js'
import { processFile } from '../api/land-data-ingest/service/ingest-schedule.service.js'

const getTableCount = async (connection, tableName) => {
  const client = await connection.connect()
  const result = await client.query(`SELECT COUNT(*) FROM ${tableName}`)
  await client.release()
  return Number(result.rows[0].count)
}

const logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}

let connection
let s3Client

// eslint-disable-next-line jest/no-disabled-tests
describe.skip('Land data ingest file processor integration test', () => {
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
  })

  const request = {
    server: {
      s3: s3Client
    },
    logger
  }

  test('should ingest multiple land parcel data', async () => {
    const initialParcelsCount = await getTableCount(connection, 'land_parcels')
    await uploadFixtureFile(
      s3Client,
      'parcels_head.csv',
      'parcels/parcels_head.csv'
    )

    await uploadFixtureFile(
      s3Client,
      'parcels_1head.csv',
      'parcels/parcels_1head.csv'
    )

    await processFile(
      'parcels/parcels_head.csv',
      request,
      'land_data_ingest',
      'Parcels ingest',
      123
    )

    await processFile(
      'parcels/parcels_1head.csv',
      request,
      'land_data_ingest',
      'Parcels ingest',
      1234
    )

    const parcelsCount = await getTableCount(connection, 'land_parcels')
    expect(Number(parcelsCount)).toBe(Number(initialParcelsCount) + 2)
  }, 30000)

  test('should ingest land cover data', async () => {
    const initialCoversCount = await getTableCount(connection, 'land_covers')
    await uploadFixtureFile(
      s3Client,
      'covers_head.csv',
      'covers/covers_head.csv'
    )

    await processFile(
      'covers/covers_head.csv',
      request,
      'land_data_ingest',
      'Land covers ingest',
      123
    )

    const coversCount = await getTableCount(connection, 'land_covers')
    expect(Number(coversCount)).toBe(Number(initialCoversCount) + 1)
  }, 30000)

  test('should ingest moorland designations data', async () => {
    const initialMoorlandDesignationsCount = await getTableCount(
      connection,
      'moorland_designations'
    )

    await uploadFixtureFile(
      s3Client,
      'moorland_head.csv',
      'moorland/moorland_head.csv'
    )

    await processFile(
      'moorland/moorland_head.csv',
      request,
      'land_data_ingest',
      'Moorland designations ingest',
      123
    )

    const moorlandDesignationsCount = await getTableCount(
      connection,
      'moorland_designations'
    )
    expect(moorlandDesignationsCount).toBe(initialMoorlandDesignationsCount + 1)
  }, 30000)
})
