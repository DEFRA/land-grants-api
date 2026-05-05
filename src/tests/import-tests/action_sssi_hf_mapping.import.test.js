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

      const actions = await getRecordsByQuery(
        connection,
        'SELECT * FROM actions WHERE sssi_eligible IS NOT TRUE OR hf_eligible IS NOT TRUE'
      )
      expect(actions).toHaveLength(4)
      expect(actions.map((a) => a.code)).to.include(
        'UPL3',
        'UPL4',
        'UPL1',
        'UPL2'
      )
      expect(actions.find((a) => a.code === 'UPL1').sssi_eligible).toBe(false)
      expect(actions.find((a) => a.code === 'UPL2').hf_eligible).toBe(false)
      expect(actions.find((a) => a.code === 'UPL3').hf_eligible).toBe(false)
      expect(actions.find((a) => a.code === 'UPL3').sssi_eligible).toBe(false)
      expect(actions.find((a) => a.code === 'UPL4').hf_eligible).toBe(false)
      expect(actions.find((a) => a.code === 'UPL4').sssi_eligible).toBe(false)
      expect(actions[0].ingest_id).toBeDefined()
      expect(actions[0].last_updated).toBeDefined()
    },
    10000
  )
})
