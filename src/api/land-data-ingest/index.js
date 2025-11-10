import { IngestScheduleController } from './controller/ingest-schedule.controller.js'
import { LandDataIngestController } from './controller/land-data-ingest.controller.js'
import { InitiateLandDataUploadController } from './controller/initiate-land-data-upload.controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const landDataIngest = {
  plugin: {
    name: 'land-data-ingest',
    register: (server) => {
      server.route([
        {
          method: 'POST',
          path: '/initiate-upload',
          ...InitiateLandDataUploadController,
          options: {
            auth: false
          }
        },
        {
          method: 'POST',
          path: '/cdp-uploader-callback',
          ...LandDataIngestController,
          options: {
            auth: false
          }
        },
        {
          method: 'GET',
          path: '/ingest-land-data-schedule',
          ...IngestScheduleController,
          options: {
            auth: false
          }
        }
      ])
    }
  }
}

export { landDataIngest }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
