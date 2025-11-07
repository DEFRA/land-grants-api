import { connectToTestDatbase } from './setup/postgres.js'
import {
  uploadFixtureFile,
  createTestS3Client,
  ensureBucketExists
} from './setup/s3-test-helpers.js'
import { fileProcessor } from '../api/land-data-ingest/service/ingest-schedule.service.js'
import { config } from '../config/index.js'

const getParcelsCount = async (connection) => {
  const client = await connection.connect()
  const result = await client.query('SELECT COUNT(*) FROM land_parcels')
  await client.release()
  return result.rows[0].count
}

const logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}

let connection
let s3Client

describe('Land data ingest integration test', () => {
  beforeAll(() => {
    connection = connectToTestDatbase()
    s3Client = createTestS3Client()
  })

  afterAll(async () => {
    await connection.end()
  }, 20000)

  test('should ingest land data', async () => {
    const initialParcelsCount = await getParcelsCount(connection)
    await ensureBucketExists(s3Client)
    await uploadFixtureFile(s3Client, 'parcels_head.csv')
    const request = {
      server: {
        s3: s3Client
      },
      logger
    }

    const result = await fileProcessor(
      request,
      'land_data_ingest',
      'Parcels ingest',
      123,
      config.get('s3.bucket')
    )

    const parcelsCount = await getParcelsCount(connection)
    expect(Number(parcelsCount)).toBe(Number(initialParcelsCount) + 1)
    expect(result).toBe(true)
  }, 30000)
})
