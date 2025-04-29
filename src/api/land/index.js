import { LandController } from './controllers/index.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const landdata = {
  plugin: {
    name: 'land',
    register: (server) => {
      server.route([
        {
          method: 'GET',
          path: '/land-data/{parcelId}',
          ...LandController
        }
      ])
    }
  }
}

export { landdata }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
