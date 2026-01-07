import {
  createTestS3Client,
  uploadFixtureFile,
  ensureBucketExists,
  deleteFiles
} from './setup/s3-test-helpers.js'

import { importLandData } from '../api/land-data-ingest/workers/ingest-schedule.module.js'
import { connectToTestDatbase } from '../db-tests/setup/postgres.js'
import { getRecordsByQuery } from './setup/db-helper.js'

describe('SSSI import', () => {
  let s3Client
  let connection

  beforeAll(async () => {
    connection = connectToTestDatbase()
    s3Client = createTestS3Client()
    await ensureBucketExists(s3Client)
  })

  afterAll(async () => {
    await connection.end()
    await deleteFiles(s3Client, ['sssi/sssi.csv'])
  })

  test('should import sssi data and return 200 ok', async () => {
    await uploadFixtureFile(s3Client, 'sssi_head.csv', 'sssi/sssi.csv')

    const result = await importLandData('sssi/sssi.csv')

    expect(result).toBe('Land data imported successfully')

    const allSSSI = await getRecordsByQuery(
      connection,
      'SELECT * FROM sssi',
      []
    )
    expect(allSSSI).toHaveLength(102)

    const sssi = await getRecordsByQuery(
      connection,
      'SELECT * FROM sssi WHERE ensis_id = $1 and global_id = $2',
      ['1001855', '{318ACB47-BB29-41E3-848E-BC27A7019C97}']
    )
    expect(sssi).toHaveLength(1)
    expect(sssi[0].ensis_id).toBe('1001855')
    expect(sssi[0].global_id).toBe('{318ACB47-BB29-41E3-848E-BC27A7019C97}')
    expect(sssi[0].sssi_name).toBe('Freeholders Wood')
    expect(sssi[0].last_updated).toBeDefined()
    expect(sssi[0].ingest_id).toBeDefined()
  }, 10000)
})
