import {
  createTestS3Client,
  uploadTestFile,
  ensureBucketExists,
  deleteFiles
} from '~/src/tests/import-tests/setup/s3-test-helpers.js'
import { S3_CONFIG } from '~/src/tests/db-tests/setup/test-config.js'

import { processMessage } from '~/src/features/grants-config/handlers/grants-config-update.handler.js'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'
import { getRecordsByQuery } from '~/src/tests/import-tests/setup/db-helper.js'

const GRANTS_CONFIG_S3_KEY =
  'land-grants/0.0.0-test/actions/actions_mapping.csv'

const MAPPING_CSV = [
  'action_code,has_sssi,has_hf',
  'CMOR1,1,1',
  'UPL1,0,1',
  'UPL2,1,0',
  'UPL3,0,0',
  'UPL4,0,0',
  'CSAM3,0,0'
].join('\n')

// Published by grants-config-land-grants via the grants-config-broker, which
// uploads files without a content type - S3 then reports binary/octet-stream.
const brokerMessage = (manifest) => ({
  MessageId: 'actions-mapping-import',
  Body: JSON.stringify(manifest),
  MessageAttributes: {
    grant: { DataType: 'String', StringValue: 'land-grants' },
    version: { DataType: 'String', StringValue: '0.0.0-test' },
    status: { DataType: 'String', StringValue: 'active' }
  }
})

describe('Actions mapping import', () => {
  const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
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
    await deleteFiles(s3Client, [GRANTS_CONFIG_S3_KEY])
  })

  test('applies the mapping from the broker manifest to the actions table', async () => {
    await uploadTestFile(
      s3Client,
      GRANTS_CONFIG_S3_KEY,
      MAPPING_CSV,
      S3_CONFIG.bucket,
      'binary/octet-stream'
    )

    await processMessage(
      brokerMessage([
        GRANTS_CONFIG_S3_KEY,
        'land-grants/0.0.0-test/metadata.json'
      ]),
      s3Client,
      connection,
      logger,
      { grantsConfigBucket: S3_CONFIG.bucket }
    )

    const actions = await getRecordsByQuery(
      connection,
      'SELECT * FROM actions WHERE sssi_eligible IS NOT TRUE OR hf_eligible IS NOT TRUE'
    )
    const eligibilityOf = (code) => {
      const action = actions.find((a) => a.code === code)
      return { sssi: action.sssi_eligible, hf: action.hf_eligible }
    }

    expect(actions.map((a) => a.code).sort()).toEqual([
      'CSAM3',
      'UPL1',
      'UPL2',
      'UPL3',
      'UPL4'
    ])
    expect(eligibilityOf('UPL1')).toEqual({ sssi: false, hf: true })
    expect(eligibilityOf('UPL2')).toEqual({ sssi: true, hf: false })
    expect(eligibilityOf('UPL3')).toEqual({ sssi: false, hf: false })
    expect(eligibilityOf('UPL4')).toEqual({ sssi: false, hf: false })
    expect(eligibilityOf('CSAM3')).toEqual({ sssi: false, hf: false })
    expect([...new Set(actions.map((a) => a.ingest_id))]).toEqual([
      GRANTS_CONFIG_S3_KEY
    ])
    expect(actions[0].last_updated).toBeDefined()
  }, 10000)
})
