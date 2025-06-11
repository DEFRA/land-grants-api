import { ParcelController, ParcelsController } from './controllers/index.js'

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
          path: '/parcels/{parcel}',
          ...ParcelController
        },
        {
          method: 'POST',
          path: '/parcels',
          ...ParcelsController
        }
      ])
    }
  }
}

export { parcel }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
