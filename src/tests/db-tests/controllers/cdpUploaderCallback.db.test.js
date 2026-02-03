import { vi } from 'vitest'
import { LandDataIngestController } from '~/src/api/land-data-ingest/controller/land-data-ingest.controller.js'
import { createResponseCapture } from '~/src/tests/db-tests/setup/utils.js'
import {
  createTestS3Client,
  uploadFixtureFile,
  ensureBucketExists,
  listTestFiles,
  clearTestBucket
} from '~/src/tests/db-tests/setup/s3-test-helpers.js'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'

describe('CDP Uploader Callback Controller', () => {
  const { h, getResponse } = createResponseCapture()
  let s3Client
  let connection
  let logger

  beforeAll(async () => {
    logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    }
    connection = connectToTestDatbase()
    s3Client = createTestS3Client()
    await ensureBucketExists(s3Client)
    await clearTestBucket(s3Client)
  })

  afterAll(async () => {
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
