import { landController } from './controllers/index.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const landRoutes = {
  plugin: {
    name: 'parcels',
    register: (server) => {
      server.route([
        {
          method: 'GET',
          path: '/land-parcels/{parcelId}',
          ...landController
        }
      ])
    }
  }
}

export { landRoutes }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
