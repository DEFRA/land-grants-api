import { ParcelsController, ParcelsControllerV2 } from './controllers/index.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const parcel = {
  plugin: {
    name: 'parcels',
    register: (server) => {
      server.route([
        {
          method: 'POST',
          path: '/parcels',
          ...ParcelsController
        },
        {
          method: 'POST',
          path: '/api/v2/parcels',
          ...ParcelsControllerV2
        }
      ])
    }
  }
}

export { parcel }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
