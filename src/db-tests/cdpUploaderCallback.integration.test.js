import { LandDataIngestController } from '../api/land-data-ingest/controller/land-data-ingest.controller.js'
import { createResponseCapture } from './setup/utils.js'
import {
  createTestS3Client,
  uploadFixtureFile,
  ensureBucketExists,
  listTestFiles,
  clearTestBucket
} from './setup/s3-test-helpers.js'

const logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}

describe('CDP uploader callback integration test', () => {
  const { h, getResponse } = createResponseCapture()
  let s3Client

  beforeAll(async () => {
    s3Client = createTestS3Client()
    await ensureBucketExists(s3Client)
  })

  afterEach(async () => {
    await clearTestBucket(s3Client)
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
    expect(files[0]).toBe('completed/parcels/parcels_head.csv')
  }, 10000)
})
