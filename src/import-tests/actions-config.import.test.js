import {
  createTestS3Client,
  uploadFixtureFile,
  ensureBucketExists,
  deleteFiles
} from './setup/s3-test-helpers.js'

import { importLandData } from '../api/land-data-ingest/workers/ingest-schedule.module.js'
import { connectToTestDatbase } from '../db-tests/setup/postgres.js'
import { getRecordsByQuery } from './setup/db-helper.js'

describe('Actions config import', () => {
  let s3Client
  let connection

  beforeAll(async () => {
    connection = connectToTestDatbase()
    s3Client = createTestS3Client()
    await ensureBucketExists(s3Client)
  })

  afterAll(async () => {
    await connection.end()
    await deleteFiles(s3Client, ['actions_config/actions_config.csv'])
  })

  test('should import actions_config data and return 200 ok', async () => {
    await uploadFixtureFile(
      s3Client,
      'actions_config_head.csv',
      'actions_config/actions_config.csv'
    )

    const result = await importLandData('actions_config/actions_config.csv')

    expect(result).toBe('Land data imported successfully')

    const allActionsConfig = await getRecordsByQuery(
      connection,
      'SELECT * FROM actions_config',
      []
    )
    expect(allActionsConfig.length).toBeGreaterThanOrEqual(3)

    const actionConfig = await getRecordsByQuery(
      connection,
      'SELECT * FROM actions_config WHERE code = $1 AND version = $2',
      ['CMOR1', 1]
    )
    expect(actionConfig).toHaveLength(1)
    expect(actionConfig[0].code).toBe('CMOR1')
    expect(Number(actionConfig[0].version)).toBe(1)
    expect(actionConfig[0].config).toBeDefined()
    expect(actionConfig[0].config.start_date).toBe('2025-01-01')
    expect(Number(actionConfig[0].config.duration_years)).toBe(3)
    expect(actionConfig[0].config.application_unit_of_measurement).toBe('ha')
    expect(actionConfig[0].config.payment).toBeDefined()
    expect(Number(actionConfig[0].config.payment.ratePerUnitGbp)).toBe(10.6)
    expect(
      Number(actionConfig[0].config.payment.ratePerAgreementPerYearGbp)
    ).toBe(272)
    expect(actionConfig[0].config.land_cover_class_codes).toBeDefined()
    expect(actionConfig[0].config.rules).toBeDefined()
    expect(actionConfig[0].is_active).toBe(false)
    expect(actionConfig[0].last_updated_at).toBeDefined()
    expect(actionConfig[0].ingest_id).toBeDefined()
    expect(actionConfig[0].ingest_date).toBeDefined()
  }, 10000)
})
