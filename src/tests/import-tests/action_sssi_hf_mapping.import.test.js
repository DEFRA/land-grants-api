import {
  createTestS3Client,
  uploadLandDataFixture,
  ensureBucketExists,
  deleteFiles
} from '~/src/tests/import-tests/setup/s3-test-helpers.js'

import { importLandData } from '~/src/features/land-data-ingest/workers/ingest.module.js'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'
import { getRecordsByQuery } from '~/src/tests/import-tests/setup/db-helper.js'

const S3_KEYS = [
  'action_sssi_hf_mapping/action_sssi_hf_mapping.csv',
  'action_sssi_hf_mapping/action_sssi_hf_mapping.zip'
]

describe('Action SSSI HF mapping import', () => {
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
    'should import action sssi hf mapping data and return 200 ok (%s)',
    async (s3Key) => {
      await uploadLandDataFixture(s3Client, 'action_sssi_hf_mapping.csv', s3Key)

      const result = await importLandData(s3Key)

      expect(result).toBe('Land data imported successfully')

      const actionSSSIHFMapping = await getRecordsByQuery(
        connection,
        'SELECT * FROM action_sssi_hf_mapping',
        []
      )
      expect(actionSSSIHFMapping).toHaveLength(5)

      const sssi = await getRecordsByQuery(
        connection,
        'SELECT * FROM action_sssi_hf_mapping WHERE action_code = $1',
        ['CMOR1']
      )
      expect(sssi).toHaveLength(1)
      expect(sssi[0].action_code).toBe('CMOR1')
      expect(sssi[0].has_sssi).toEqual(true)
      expect(sssi[0].has_hf).toEqual(true)
      expect(sssi[0].last_updated).toBeDefined()
    },
    10000
  )
})
