import {
  createTestS3Client,
  uploadFixtureFile,
  ensureBucketExists,
  deleteFiles
} from '~/src/tests/import-tests/setup/s3-test-helpers.js'

import { importLandData } from '~/src/api/land-data-ingest/workers/ingest.module.js'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'
import { getRecordsByQuery } from '~/src/tests/import-tests/setup/db-helper.js'

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
      'SELECT * FROM data_layer WHERE data_layer_type_id = 1',
      []
    )
    expect(allSSSI).toHaveLength(102)

    const sssi = await getRecordsByQuery(
      connection,
      'SELECT * FROM data_layer WHERE source_id = $1',
      ['{318ACB47-BB29-41E3-848E-BC27A7019C97}']
    )
    expect(sssi).toHaveLength(1)
    expect(sssi[0].name).toBe('Freeholders Wood')
    expect(sssi[0].metadata).toEqual({
      ensis_id: 1001855,
      condition: 'FAVOURABLE'
    })
    expect(sssi[0].data_layer_type_id).toBe(1)
    expect(sssi[0].last_updated).toBeDefined()
    expect(sssi[0].ingest_date).toBeDefined()
    expect(sssi[0].ingest_id).toBeDefined()
    expect(sssi[0].geom).toBeDefined()
  }, 10000)
})
