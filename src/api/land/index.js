import { LandController } from './controllers/index.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const landdata = {
  plugin: {
    name: 'landdata',
    register: (server) => {
      server.route([
        {
          method: 'GET',
          path: '/land-data/{landParcelId}',
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
