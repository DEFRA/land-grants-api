import {
  createTestS3Client,
  uploadLandDataFixture,
  ensureBucketExists,
  listTestFiles,
  deleteFiles
} from '~/src/tests/import-tests/setup/s3-test-helpers.js'

import { importLandData } from '~/src/features/land-data-ingest/workers/ingest.module.js'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'
import { getRecordsByQuery } from '~/src/tests/import-tests/setup/db-helper.js'

const S3_KEYS = [
  'compatibility_matrix/compatibility_matrix_head.csv',
  'compatibility_matrix/compatibility_matrix_head.zip'
]

describe('Compatibility matrix import', () => {
  let s3Client
  let connection

  beforeAll(async () => {
    connection = connectToTestDatbase()
    s3Client = createTestS3Client()
    await ensureBucketExists(s3Client)
  })

  afterAll(async () => {
    await connection.end()
  })

  afterEach(async () => {
    await deleteFiles(s3Client, S3_KEYS)
  })

  test.each(S3_KEYS.map((key) => [key]))(
    'should import compatibility matrix data and return 200 ok (%s)',
    async (s3Key) => {
      await uploadLandDataFixture(
        s3Client,
        'compatibility_matrix_head.csv',
        s3Key
      )

      const result = await importLandData(s3Key)

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
      expect(compatibilityMatrix[0].ingest_date).toBeDefined()

      const files = await listTestFiles(s3Client)
      expect(files).toContain(s3Key)
    },
    10000
  )
})
