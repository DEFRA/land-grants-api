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

  describe('for a code with no action config', () => {
    // A code no other test or migration uses, so it can be inserted and removed freely
    const NEW_CODE = 'MAP_ONLY1'
    const ACTION_CONFIG_S3_KEY = `land-grants/0.0.0-test/actions_config/${NEW_CODE}/map_only1-1.0.0.json`

    const process = (manifest) =>
      processMessage(brokerMessage(manifest), s3Client, connection, logger, {
        grantsConfigBucket: S3_CONFIG.bucket
      })

    const actionRow = async () => {
      const [row] = await getRecordsByQuery(
        connection,
        'SELECT code, enabled, display, sssi_eligible, hf_eligible, ingest_id FROM actions WHERE code = $1',
        [NEW_CODE]
      )
      return row
    }

    const deleteNewCode = async () => {
      await getRecordsByQuery(
        connection,
        'DELETE FROM actions_config WHERE code = $1',
        [NEW_CODE]
      )
      await getRecordsByQuery(
        connection,
        'DELETE FROM actions WHERE code = $1',
        [NEW_CODE]
      )
    }

    beforeAll(async () => {
      await deleteNewCode()
      await uploadTestFile(
        s3Client,
        GRANTS_CONFIG_S3_KEY,
        `${MAPPING_CSV}\n${NEW_CODE},0,1`,
        S3_CONFIG.bucket,
        'binary/octet-stream'
      )
      await process([GRANTS_CONFIG_S3_KEY])
    })

    afterAll(async () => {
      await deleteFiles(s3Client, [ACTION_CONFIG_S3_KEY])
      await deleteNewCode()
    })

    test('creates its actions row from the mapping alone', async () => {
      expect(await actionRow()).toEqual({
        code: NEW_CODE,
        enabled: null,
        display: null,
        sssi_eligible: false,
        hf_eligible: true,
        ingest_id: GRANTS_CONFIG_S3_KEY
      })
    })

    test('keeps the mapped eligibility when its action config arrives later', async () => {
      await uploadTestFile(
        s3Client,
        ACTION_CONFIG_S3_KEY,
        JSON.stringify({
          code: NEW_CODE,
          semanticVersion: '1.0.0',
          description: 'Mapping only test action',
          applicationUnitOfMeasurement: 'ha',
          enabled: true,
          display: true
        }),
        S3_CONFIG.bucket,
        'binary/octet-stream'
      )
      await process([ACTION_CONFIG_S3_KEY])

      expect(await actionRow()).toEqual({
        code: NEW_CODE,
        enabled: true,
        display: true,
        sssi_eligible: false,
        hf_eligible: true,
        ingest_id: GRANTS_CONFIG_S3_KEY
      })
    })
  })

  describe('for an action config with no mapping row', () => {
    // A code no other test or migration uses, and never added to the mapping
    const UNMAPPED_CODE = 'UNMAPPED1'
    const ACTION_CONFIG_S3_KEY = `land-grants/0.0.0-test/actions_config/${UNMAPPED_CODE}/unmapped1-1.0.0.json`

    const rowsFor = (table) =>
      getRecordsByQuery(
        connection,
        `SELECT code FROM ${table} WHERE code = $1`,
        [UNMAPPED_CODE]
      )

    afterAll(async () => {
      await deleteFiles(s3Client, [ACTION_CONFIG_S3_KEY])
    })

    test('fails without creating an actions or actions_config row', async () => {
      await uploadTestFile(
        s3Client,
        ACTION_CONFIG_S3_KEY,
        JSON.stringify({
          code: UNMAPPED_CODE,
          semanticVersion: '1.0.0',
          applicationUnitOfMeasurement: 'ha'
        }),
        S3_CONFIG.bucket,
        'binary/octet-stream'
      )

      await expect(
        processMessage(
          brokerMessage([ACTION_CONFIG_S3_KEY]),
          s3Client,
          connection,
          logger,
          {
            grantsConfigBucket: S3_CONFIG.bucket
          }
        )
      ).rejects.toThrow(`Failed to insert action config: code=${UNMAPPED_CODE}`)

      expect(await rowsFor('actions')).toEqual([])
      expect(await rowsFor('actions_config')).toEqual([])
    })
  })
})
