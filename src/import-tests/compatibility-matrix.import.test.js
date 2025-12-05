import {
  createTestS3Client,
  uploadFixtureFile,
  ensureBucketExists,
  listTestFiles,
  clearTestBucket
} from './setup/s3-test-helpers.js'

import { importLandData } from '../api/land-data-ingest/workers/ingest-schedule.module.js'
import { connectToTestDatbase } from '../db-tests/setup/postgres.js'
import { getRecordsByQuery } from './setup/db-helper.js'

describe('Compatibility matrix import', () => {
  let s3Client
  let connection

  beforeAll(async () => {
    connection = connectToTestDatbase()
    s3Client = createTestS3Client()
    await ensureBucketExists(s3Client)
    await clearTestBucket(s3Client)
  })

  test('should import compatibility matrix data and return 200 ok', async () => {
    await uploadFixtureFile(
      s3Client,
      'compatibility_matrix_head.csv',
      'compatibility_matrix/compatibility_matrix_head.csv'
    )

    const result = await importLandData(
      'compatibility_matrix/compatibility_matrix_head.csv'
    )

    expect(result).toBe('Land data imported successfully')

    const compatibilityMatrix = await getRecordsByQuery(
      connection,
      'SELECT * FROM compatibility_matrix WHERE option_code = $1',
      ['AB1']
    )

    expect(compatibilityMatrix).toHaveLength(10)
    expect(compatibilityMatrix[0].option_code).toBe('AB1')
    expect(compatibilityMatrix[0].option_code_compat).toBe('AB4')
    expect(compatibilityMatrix[0].year).toBe('2025')

    const files = await listTestFiles(s3Client)
    expect(files).toHaveLength(1)
    expect(files[0]).toBe('compatibility_matrix/compatibility_matrix_head.csv')
  }, 10000)
})
