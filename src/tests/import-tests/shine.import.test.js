import {
    createTestS3Client,
    uploadFixtureFile,
    ensureBucketExists,
    deleteFiles
} from '~/src/tests/import-tests/setup/s3-test-helpers.js'

import { importLandData } from '~/src/features/land-data-ingest/workers/ingest.module.js'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'
import { getRecordsByQuery } from '~/src/tests/import-tests/setup/db-helper.js'

describe('Shine import', () => {
    let s3Client
    let connection

    beforeAll(async () => {
        connection = connectToTestDatbase()
        s3Client = createTestS3Client()
        await ensureBucketExists(s3Client)
    })

    afterAll(async () => {
        await connection.end()
        await deleteFiles(s3Client, ['shine/shine_head.csv'])
    })

    test('should import shine data and return 200 ok', async () => {
        await uploadFixtureFile(s3Client, 'shine_head.csv', 'shine/shine_head.csv')

        const result = await importLandData('shine/shine_head.csv')

        expect(result).toBe('Land data imported successfully')

        const allShine = await getRecordsByQuery(
            connection,
            "SELECT * FROM data_layer WHERE data_layer_type_id = 3 and metadata->>'type' = 'shine';",
            []
        )
        expect(allShine).toHaveLength(3)

        const shine1 = allShine.find(s => s.source_id === 'KE23547')
        expect(shine1.name).toBe('Post-medieval outfarm south east of Rocks Farm')
        expect(shine1.metadata).toEqual({
            significan: 'Medium',
            web_url: null,
            type: 'shine',
            shine_form: 'Below-ground feature(s)'
        })
        expect(shine1.data_layer_type_id).toBe(3)
        expect(shine1.last_updated).toBeDefined()
        expect(shine1.ingest_date).toBeDefined()
        expect(shine1.ingest_id).toBeDefined()
        expect(shine1.geom).toBeDefined()
    }, 10000)
})
