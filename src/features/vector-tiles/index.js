import { ParcelTilesController } from './controllers/parcelTiles.controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const vectorTiles = {
  plugin: {
    name: 'vector-tiles',
    register: (server) => {
      server.route([
        {
          method: 'POST',
          path: '/api/v1/parcel-tiles/{z}/{x}/{y}',
          handler: ParcelTilesController.handler,
          options: {
            ...ParcelTilesController.options,
            // TODO: temporary — re-enable auth before this leaves the spike
            auth: false
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
