import { ParcelController } from './controllers/index.js'

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
          path: '/parcel/{parcel}',
          ...ParcelController
        }
      ])
    }
  }
}

export { landRoutes }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
