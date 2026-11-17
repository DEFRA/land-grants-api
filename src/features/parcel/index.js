import {
  ParcelsControllerV2,
  ParcelSupplementsControllerV2
} from './controllers/index.js'

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
          path: '/api/v2/parcels',
          ...ParcelsControllerV2
        },
        {
          method: 'POST',
          path: '/api/v2/parcels/supplements',
          ...ParcelSupplementsControllerV2
        }
      ])
    }
  }
}

export { parcel }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
