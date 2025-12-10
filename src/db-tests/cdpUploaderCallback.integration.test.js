import { LandDataIngestController } from '../api/land-data-ingest/controller/land-data-ingest.controller.js'
import { createResponseCapture } from './setup/utils.js'
import {
  createTestS3Client,
  uploadFixtureFile,
  ensureBucketExists,
  listTestFiles,
  clearTestBucket
} from '../import-tests/setup/s3-test-helpers.js'
import { connectToTestDatbase } from './setup/postgres.js'
import { clearTestData } from './setup/db-helper.js'

const logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}

describe('CDP uploader callback integration test', () => {
  const { h, getResponse } = createResponseCapture()
  let s3Client
  let connection

  beforeAll(async () => {
    connection = connectToTestDatbase()
    s3Client = createTestS3Client()
    await ensureBucketExists(s3Client)
    await clearTestBucket(s3Client)
  })

  afterAll(async () => {
    await clearTestData(connection)
    await connection.end()
  })

  test('should return 200 with success message when payload is valid', async () => {
    await uploadFixtureFile(
      s3Client,
      'parcels_head.csv',
      'parcels/parcels_head.csv'
    )

    const request = {
      payload: {
        form: {
          file: {
            s3Key: 'parcels/parcels_head.csv',
            fileStatus: 'complete'
          }
        }
      },
      logger,
      server: {
        s3: s3Client
      }
    }

    await LandDataIngestController.handler(request, h)

    const { statusCode } = getResponse()

    const files = await listTestFiles(s3Client)
    expect(statusCode).toBe(200)
    expect(files).toHaveLength(1)
    expect(files[0]).toBe('parcels/parcels_head.csv')
  }, 10000)
})
