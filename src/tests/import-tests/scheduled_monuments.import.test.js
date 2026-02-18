import {
    createTestS3Client,
    uploadFixtureFile,
    ensureBucketExists,
    deleteFiles
} from '~/src/tests/import-tests/setup/s3-test-helpers.js'

import { importLandData } from '~/src/features/land-data-ingest/workers/ingest.module.js'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'
import { getRecordsByQuery } from '~/src/tests/import-tests/setup/db-helper.js'

describe('Scheduled monuments import', () => {
    let s3Client
    let connection

    beforeAll(async () => {
        connection = connectToTestDatbase()
        s3Client = createTestS3Client()
        await ensureBucketExists(s3Client)
    })

    afterAll(async () => {
        await connection.end()
        await deleteFiles(s3Client, ['scheduled_monuments/scheduled_monuments.csv'])
    })

    test('should import scheduled monuments data and return 200 ok', async () => {
        await uploadFixtureFile(s3Client, 'scheduled_monuments_head.csv', 'scheduled_monuments/scheduled_monuments.csv')

        const result = await importLandData('scheduled_monuments/scheduled_monuments.csv')

        expect(result).toBe('Land data imported successfully')

        const allScheduledMonuments = await getRecordsByQuery(
            connection,
            "SELECT * FROM data_layer WHERE data_layer_type_id = 3 and metadata->>'type' = 'scheduled_monuments'",
            []
        )
        expect(allScheduledMonuments).toHaveLength(3)

        const scheduledMonument = allScheduledMonuments.find(sm => sm.source_id === '1001718')
        expect(scheduledMonument.name).toBe('Mound S of Woodbrook')
        expect(scheduledMonument.metadata).toEqual({
            SchedDate: null,
            CaptureScale: '1:10000',
            hyperlink: 'https://historicengland.org.uk/listing/the-list/list-entry/1001718',
            area_ha: 0.214314221290903,
            NGR: 'SO 30447 54456',
            Easting: 330447,
            Northing: 254456,
            type: 'scheduled_monuments'
        })
        expect(scheduledMonument.data_layer_type_id).toBe(3)
        expect(scheduledMonument.last_updated).toBeDefined()
        expect(scheduledMonument.ingest_date).toBeDefined()
        expect(scheduledMonument.ingest_id).toBeDefined()
        expect(scheduledMonument.geom).toBeDefined()
    }, 10000)
})
