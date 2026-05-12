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
          ...ParcelTilesController
        }
      ])
    }
  }
}

export { vectorTiles }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
