import {
  findLandParcelController,
  findLandParcelBySbiController,
  findLandCoverController,
  findLandCoverCodeController,
  findLandParcelIntersectsController
} from './controllers/index.js'
/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const land = {
  plugin: {
    name: 'land',
    register: (server) => {
      server.route([
        {
          method: 'GET',
          path: '/land/parcel/id/{landParcelId}',
          ...findLandParcelController
        },
        {
          method: 'GET',
          path: '/land/parcel/{sbi}',
          ...findLandParcelBySbiController
        },
        {
          method: 'GET',
          path: '/land/cover/{landParcelId}',
          ...findLandCoverController
        },
        {
          method: 'GET',
          path: '/land/code/{landCoverCode}',
          ...findLandCoverCodeController
        },
        {
          method: 'GET',
          path: '/land/parcel/{landParcelId}/intersects',
          ...findLandParcelIntersectsController
        }
      ])
    }
  }
}

export { land }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
