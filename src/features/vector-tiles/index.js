import { ParcelTilesController } from './controllers/parcel-tiles.controller.js'
import { ParcelTilesLocateController } from './controllers/parcel-tiles-locate.controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const vectorTiles = {
  plugin: {
    name: 'vector-tiles',
    register: (server) => {
      server.route([
        {
          method: 'GET',
          path: '/api/v1/parcel-tiles/{z}/{x}/{y}',
          handler: ParcelTilesController.handler,
          options: {
            ...ParcelTilesController.options,
            auth: false
          }
        },
        {
          method: 'POST',
          path: '/api/v1/parcel-tiles/locate',
          handler: ParcelTilesLocateController.handler,
          options: {
            ...ParcelTilesLocateController.options
          }
        }
      ])
    }
  }
}

export { vectorTiles }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
