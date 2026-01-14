import {
  createTestS3Client,
  uploadFixtureFile,
  ensureBucketExists,
  deleteFiles
} from './setup/s3-test-helpers.js'

import { importLandData } from '../api/land-data-ingest/workers/ingest-schedule.module.js'
import { connectToTestDatbase } from '../db-tests/setup/postgres.js'
import { getRecordsByQuery } from './setup/db-helper.js'

describe('Actions import', () => {
  let s3Client
  let connection

  beforeAll(async () => {
    connection = connectToTestDatbase()
    s3Client = createTestS3Client()
    await ensureBucketExists(s3Client)
  })

  afterAll(async () => {
    await connection.end()
    await deleteFiles(s3Client, ['actions/actions.csv'])
  })

  test('should import actions data and return 200 ok', async () => {
    await uploadFixtureFile(s3Client, 'actions_head.csv', 'actions/actions.csv')

    const result = await importLandData('actions/actions.csv')

    expect(result).toBe('Land data imported successfully')

    const allActions = await getRecordsByQuery(
      connection,
      'SELECT * FROM actions',
      []
    )
    expect(allActions.length).toBeGreaterThanOrEqual(5)

    const action = await getRecordsByQuery(
      connection,
      'SELECT * FROM actions WHERE code = $1',
      ['CMOR1']
    )
    expect(action).toHaveLength(1)
    expect(action[0].code).toBe('CMOR1')
    expect(action[0].description).toBe(
      'CMOR1: Assess moorland and produce a written record'
    )
    expect(action[0].enabled).toBe(true)
    expect(action[0].display).toBe(true)
    expect(action[0].ingest_id).toBeDefined()
    expect(action[0].ingest_date).toBeDefined()
  }, 10000)
})
