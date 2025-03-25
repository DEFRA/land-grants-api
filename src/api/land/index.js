import { landController, landActionsController } from './controllers/index.js'

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
          path: '/parcel/{parcelId}/sheet/{sheetId}',
          ...landController
        },
        {
          method: 'GET',
          path: '/parcel/{parcelId}',
          ...landActionsController
        }
      ])
    }
  }
}

export { landRoutes }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
