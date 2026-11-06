import {
  createTestS3Client,
  uploadLandDataFixture,
  ensureBucketExists,
  listTestFiles,
  deleteFiles
} from '~/src/tests/import-tests/setup/s3-test-helpers.js'

import { importLandData } from '~/src/features/land-data-ingest/workers/import-land-data.js'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'
import { getRecordsByQuery } from '~/src/tests/import-tests/setup/db-helper.js'

const S3_KEYS = [
  'compatibility_matrix/compatibility_matrix_head.csv',
  'compatibility_matrix/compatibility_matrix_head.zip'
]

describe('Compatibility matrix import', () => {
  let s3Client
  let connection

  beforeAll(async () => {
    connection = connectToTestDatabase()
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
    async (s3key) => {
      await uploadLandDataFixture(
        s3Client,
        'compatibility_matrix_head.csv',
        s3key
      )

      const result = await importLandData({ s3key })

      expect(result).toEqual({
        message: 'Land data imported successfully',
        dataChanged: true
      })

      const compatibilityMatrix = await getRecordsByQuery(
        connection,
        'SELECT * FROM compatibility_matrix WHERE option_code = $1',
        ['TE3']
      )

      expect(compatibilityMatrix).toHaveLength(3)
      expect(compatibilityMatrix[0].option_code).toBe('TE3')
      expect(compatibilityMatrix[0].option_code_compat).toBe('BE3')
      expect(compatibilityMatrix[0].year).toBe('2026')
      expect(compatibilityMatrix[0].type).toBe('ELCPRV')

      const files = await listTestFiles(s3Client)
      expect(files).toContain(s3key)
    },
    10000
  )
})
