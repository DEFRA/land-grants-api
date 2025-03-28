import { ParcelController } from './controllers/index.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const parcel = {
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

export { parcel }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
