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
import { getEnabledActions } from '~/src/features/actions/queries/getEnabledActions.query.js'
import { getActionsByLatestVersion } from '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
import { getActionsByVersion } from '~/src/features/actions/queries/2.0.0/getActionsByVersion.query.js'

// A code no other test or migration uses, so it can be inserted and removed freely
const TEST_CODE = 'DESC_TEST1'
const ACTION_CONFIG_S3_KEY = `land-grants/0.0.0-test/actions_config/${TEST_CODE}/desc_test1-1.0.0.json`
// Only the actions eligibility file creates actions rows, so the code needs a row there too.
// A key of its own, so it never collides with the eligibility import test's upload.
const ELIGIBILITY_S3_KEY =
  'land-grants/0.0.0-desc-test/actions/actions_eligibility.csv'

const actionConfig = {
  code: TEST_CODE,
  semanticVersion: '1.0.0',
  description: 'Description test action',
  applicationUnitOfMeasurement: 'ha'
}

const brokerMessage = (manifest) => ({
  MessageId: 'action-config-description-import',
  Body: JSON.stringify(manifest),
  MessageAttributes: {
    grant: { DataType: 'String', StringValue: 'land-grants' },
    version: { DataType: 'String', StringValue: '0.0.0-test' },
    status: { DataType: 'String', StringValue: 'active' }
  }
})

describe('Action config description', () => {
  const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
  let s3Client
  let connection

  const deleteTestAction = async () => {
    await getRecordsByQuery(
      connection,
      'DELETE FROM actions_config WHERE code = $1',
      [TEST_CODE]
    )
    await getRecordsByQuery(connection, 'DELETE FROM actions WHERE code = $1', [
      TEST_CODE
    ])
  }

  beforeAll(async () => {
    connection = connectToTestDatabase()
    s3Client = createTestS3Client()
    await ensureBucketExists(s3Client)
    await deleteTestAction()

    await uploadTestFile(
      s3Client,
      ACTION_CONFIG_S3_KEY,
      JSON.stringify(actionConfig),
      S3_CONFIG.bucket,
      'binary/octet-stream'
    )
    await uploadTestFile(
      s3Client,
      ELIGIBILITY_S3_KEY,
      `action_code,has_sssi,has_hf,sidedness\n${TEST_CODE},1,1,`,
      S3_CONFIG.bucket,
      'binary/octet-stream'
    )
    await processMessage(
      brokerMessage([
        ELIGIBILITY_S3_KEY,
        ACTION_CONFIG_S3_KEY,
        'land-grants/0.0.0-test/metadata.json'
      ]),
      s3Client,
      connection,
      logger,
      { grantsConfigBucket: S3_CONFIG.bucket }
    )
  }, 10000)

  afterAll(async () => {
    await deleteFiles(s3Client, [ACTION_CONFIG_S3_KEY, ELIGIBILITY_S3_KEY])
    await deleteTestAction()
    await connection.end()
  })

  test('migration copies the action description into every config version for that code', async () => {
    const mismatched = await getRecordsByQuery(
      connection,
      `SELECT ac.code, ac.semantic_version, ac.description, a.description AS action_description
       FROM actions_config ac
       JOIN actions a ON a.code = ac.code
       WHERE a.description IS NOT NULL
         AND ac.description IS DISTINCT FROM a.description
         AND ac.code <> $1`,
      [TEST_CODE]
    )
    const [{ count }] = await getRecordsByQuery(
      connection,
      `SELECT COUNT(*)::int AS count
       FROM actions_config ac
       JOIN actions a ON a.code = ac.code
       WHERE a.description IS NOT NULL`
    )

    expect(count).toBeGreaterThan(0)
    expect(mismatched).toEqual([])
  })

  test('stores the description from a published action config on its config version', async () => {
    const configs = await getRecordsByQuery(
      connection,
      'SELECT semantic_version, description FROM actions_config WHERE code = $1',
      [TEST_CODE]
    )

    expect(configs).toEqual([
      { semantic_version: '1.0.0', description: 'Description test action' }
    ])
  })

  // actions.description is kept only until it is dropped, so no read may depend on it
  describe('when actions.description differs from the config description', () => {
    beforeAll(async () => {
      await getRecordsByQuery(
        connection,
        "UPDATE actions SET description = 'Stale actions description' WHERE code = $1",
        [TEST_CODE]
      )
    })

    const descriptionOf = (actions) =>
      actions.find((action) => action.code === TEST_CODE)?.description

    test('getEnabledActions returns the config description', async () => {
      expect(descriptionOf(await getEnabledActions(logger, connection))).toBe(
        'Description test action'
      )
    })

    test('getActionsByLatestVersion returns the config description', async () => {
      expect(
        descriptionOf(await getActionsByLatestVersion(logger, connection))
      ).toBe('Description test action')
    })

    test('getActionsByVersion returns the config description', async () => {
      expect(
        descriptionOf(
          await getActionsByVersion(logger, connection, [
            { code: TEST_CODE, version: '1.0.0' }
          ])
        )
      ).toBe('Description test action')
    })
  })
})
