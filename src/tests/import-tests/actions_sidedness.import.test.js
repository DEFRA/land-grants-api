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

// Codes no other test or migration uses, so they can be inserted and removed freely
const SINGLE_SIDE_CODE = 'SIDED_TEST1'
const BOTH_SIDES_CODE = 'SIDED_TEST2'
const UNREGISTERED_CODE = 'SIDED_TEST3'
const TEST_CODES = [SINGLE_SIDE_CODE, BOTH_SIDES_CODE, UNREGISTERED_CODE]

// A release version of its own, so these files never collide with another import test's
const RELEASE = 'land-grants/0.0.0-sidedness-test'
const SIDEDNESS_S3_KEY = `${RELEASE}/actions/actions_sidedness.csv`
const MAPPING_S3_KEY = `${RELEASE}/actions/actions_mapping.csv`

const csv = (...lines) => lines.join('\n')

// Published by grants-config-land-grants via the grants-config-broker, which
// uploads files without a content type - S3 then reports binary/octet-stream.
const brokerMessage = (manifest) => ({
  MessageId: 'actions-sidedness-import',
  Body: JSON.stringify(manifest),
  MessageAttributes: {
    grant: { DataType: 'String', StringValue: 'land-grants' },
    version: { DataType: 'String', StringValue: '0.0.0-sidedness-test' },
    status: { DataType: 'String', StringValue: 'active' }
  }
})

describe('Actions sidedness import', () => {
  const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
  let s3Client
  let connection

  const query = (sql, values) => getRecordsByQuery(connection, sql, values)

  const deleteTestActions = () =>
    query('DELETE FROM actions WHERE code = ANY($1)', [TEST_CODES])

  const insertTestActions = (...codes) =>
    query(
      'INSERT INTO actions (code, enabled, display) SELECT unnest($1::text[]), FALSE, FALSE',
      [codes]
    )

  const publish = async (files) => {
    for (const [key, body] of Object.entries(files)) {
      await uploadTestFile(
        s3Client,
        key,
        body,
        S3_CONFIG.bucket,
        'binary/octet-stream'
      )
    }
    await processMessage(
      brokerMessage([...Object.keys(files), `${RELEASE}/metadata.json`]),
      s3Client,
      connection,
      logger,
      { grantsConfigBucket: S3_CONFIG.bucket }
    )
  }

  // Nothing reads sidedness yet, so the stored row is the result
  const actionFor = async (code) => {
    const [action] = await query('SELECT * FROM actions WHERE code = $1', [
      code
    ])
    return action
  }

  beforeAll(async () => {
    connection = connectToTestDatabase()
    s3Client = createTestS3Client()
    await ensureBucketExists(s3Client)
  })

  afterAll(async () => {
    await deleteFiles(s3Client, [SIDEDNESS_S3_KEY, MAPPING_S3_KEY])
    await deleteTestActions()
    await connection.end()
  })

  describe('when a sidedness file is published', () => {
    beforeAll(async () => {
      await deleteTestActions()
      await insertTestActions(SINGLE_SIDE_CODE, BOTH_SIDES_CODE)

      await publish({
        [SIDEDNESS_S3_KEY]: csv(
          'action_code,sidedness',
          `${SINGLE_SIDE_CODE},single-side`,
          `${UNREGISTERED_CODE},both-sides`
        )
      })
    }, 10000)

    test('stores the sidedness of a listed action', async () => {
      expect((await actionFor(SINGLE_SIDE_CODE)).sidedness).toBe('single-side')
    })

    test('leaves an unlisted action with no sidedness', async () => {
      expect((await actionFor(BOTH_SIDES_CODE)).sidedness).toBeNull()
    })

    test('does not create an action for a code with no actions row', async () => {
      expect(await actionFor(UNREGISTERED_CODE)).toBeUndefined()
    })

    test('records the sidedness file as the action ingest', async () => {
      expect((await actionFor(SINGLE_SIDE_CODE)).ingest_id).toBe(
        SIDEDNESS_S3_KEY
      )
    })
  })

  describe('when a sidedness file holds an invalid value', () => {
    let failure

    beforeAll(async () => {
      await deleteTestActions()
      await insertTestActions(SINGLE_SIDE_CODE, BOTH_SIDES_CODE)

      failure = await publish({
        [SIDEDNESS_S3_KEY]: csv(
          'action_code,sidedness',
          `${BOTH_SIDES_CODE},both-sides`,
          `${SINGLE_SIDE_CODE},one-side`
        )
      }).catch((error) => error)
    }, 10000)

    test('fails the config update', () => {
      expect(failure).toBeInstanceOf(Error)
    })

    test('changes no action, including those with a valid value', async () => {
      const sidednesses = await query(
        'SELECT sidedness FROM actions WHERE code = ANY($1)',
        [[SINGLE_SIDE_CODE, BOTH_SIDES_CODE]]
      )

      expect(sidednesses).toEqual([{ sidedness: null }, { sidedness: null }])
    })
  })

  describe('when a release has no sidedness file', () => {
    beforeAll(async () => {
      await deleteTestActions()
      await insertTestActions(SINGLE_SIDE_CODE)
      await query('UPDATE actions SET sidedness = $1 WHERE code = $2', [
        'single-side',
        SINGLE_SIDE_CODE
      ])

      await publish({
        [MAPPING_S3_KEY]: csv(
          'action_code,has_sssi,has_hf',
          `${SINGLE_SIDE_CODE},0,0`
        )
      })
    }, 10000)

    test('still applies the rest of the release', async () => {
      expect((await actionFor(SINGLE_SIDE_CODE)).sssi_eligible).toBe(false)
    })

    test('keeps the existing sidedness', async () => {
      expect((await actionFor(SINGLE_SIDE_CODE)).sidedness).toBe('single-side')
    })
  })
})
