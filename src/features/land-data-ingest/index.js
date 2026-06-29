import { LandDataIngestController } from './controller/land-data-ingest.controller.js'
import { InitiateLandDataUploadController } from './controller/initiate-land-data-upload.controller.js'
import { StartIngestController } from './controller/start-ingest.controller.js'
import { StatusIngestController } from './controller/status-ingest.controller.js'

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
          handler: InitiateLandDataUploadController.handler,
          options: {
            ...InitiateLandDataUploadController.options
          }
        },
        {
          method: 'POST',
          path: '/cdp-uploader-callback',
          handler: LandDataIngestController.handler,
          options: {
            ...LandDataIngestController.options
          }
        },
        {
          method: 'POST',
          path: '/ingest/{entity}/start',
          handler: StartIngestController.handler,
          options: {
            ...StartIngestController.options
          }
        },
        {
          method: 'GET',
          path: '/ingest/status',
          handler: StatusIngestController.handler,
          options: {
            ...StatusIngestController.options,
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
