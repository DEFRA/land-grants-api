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
  'agreements/agreements_head.csv',
  'agreements/agreements_head.zip'
]

describe('Agreements import', () => {
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
    'should import agreements data and return 200 ok (%s)',
    async (s3Key) => {
      await uploadLandDataFixture(s3Client, 'agreements_head.csv', s3Key)

      const result = await importLandData(s3Key)

      expect(result).toBe('Land data imported successfully')

      const agreements = await getRecordsByQuery(
        connection,
        'SELECT * FROM agreements WHERE sheet_id = $1 AND parcel_id = $2',
        ['SD6919', '68']
      )

      expect(agreements).toHaveLength(1)

      const [agreement] = agreements
      expect(agreement.sheet_id).toBe('SD6919')
      expect(agreement.parcel_id).toBe('68')
      expect(agreement.actions).toHaveLength(2)
      expect(agreement.ingest_date).toBeDefined()
      const [action1, action2] = agreement.actions
      expect(action1.actionCode).toBe('CMOR1')
      expect(action1.unit).toBe('ha')
      expect(action1.quantity).toBe(0.8617)
      expect(action1.startDate).toBe('2025-01-01T00:00:00+00:00')
      expect(action1.endDate).toBe('2027-12-31T00:00:00+00:00')
      expect(action2.actionCode).toBe('UPL8')
      expect(action2.unit).toBe('ha')
      expect(action2.quantity).toBe(0.8617)
      expect(action2.startDate).toBe('2025-01-01T00:00:00+00:00')
      expect(action2.endDate).toBe('2027-12-31T00:00:00+00:00')

      const files = await listTestFiles(s3Client)
      expect(files).toContain(s3Key)
    },
    10000
  )
})
