import {
  createTestS3Client,
  uploadFixtureFile,
  ensureBucketExists,
  deleteFiles
} from '~/src/tests/import-tests/setup/s3-test-helpers.js'

import { importLandData } from '~/src/features/land-data-ingest/workers/ingest.module.js'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'
import { getRecordsByQuery } from '~/src/tests/import-tests/setup/db-helper.js'

describe('Registered battlefields import', () => {
  let s3Client
  let connection

  beforeAll(async () => {
    connection = connectToTestDatbase()
    s3Client = createTestS3Client()
    await ensureBucketExists(s3Client)
  })

  afterAll(async () => {
    await connection.end()
    await deleteFiles(s3Client, [
      'registered_battlefields/registeredBattlefields.csv'
    ])
  })

  test('should import registered battlefields data and return 200 ok', async () => {
    await uploadFixtureFile(
      s3Client,
      'registered_battlefields_head.csv',
      'registered_battlefields/registeredBattlefields.csv'
    )

    const result = await importLandData(
      'registered_battlefields/registeredBattlefields.csv'
    )

    expect(result).toBe('Land data imported successfully')

    const allBattlefields = await getRecordsByQuery(
      connection,
      "SELECT * FROM data_layer WHERE data_layer_type_id = 3 and metadata->>'type' = 'registered_battlefields';",
      []
    )
    expect(allBattlefields).toHaveLength(2)

    const battlefield = allBattlefields.find((b) => b.source_id === '1000000')
    expect(battlefield.name).toBe('Battle of Adwalton Moor 1643')
    expect(battlefield.metadata).toEqual({
      area_ha: 107.585931633297,
      ngr: 'SE2164428855',
      hyperlink:
        'https://historicengland.org.uk/listing/the-list/list-entry/1000000',
      reg_date: '1995/06/06 00:00:00+00',
      amend_date: '2017/09/29 13:55:59+00',
      capture_scale: '1:10000',
      type: 'registered_battlefields'
    })
    expect(battlefield.data_layer_type_id).toBe(3)
    expect(battlefield.last_updated).toBeDefined()
    expect(battlefield.ingest_date).toBeDefined()
    expect(battlefield.ingest_id).toBeDefined()
    expect(battlefield.geom).toBeDefined()
  }, 10000)
})
