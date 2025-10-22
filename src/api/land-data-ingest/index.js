import { LandDataIngestController } from './controller/land-data-ingest.controller.js'

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
          path: '/cdp-uploader-callback',
          ...LandDataIngestController
        }
      ])
    }
  }
}

export { landDataIngest }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
