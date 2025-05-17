import { LandController, LandAreaController } from './controllers/index.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const landdata = {
  plugin: {
    name: 'landdata',
    register: (server) => {
      server.route([
        {
          method: 'GET',
          path: '/land-data/{landParcelId}',
          ...LandController
        }
      ])
    }
  }
}

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const landarea = {
  plugin: {
    name: 'landarea',
    register: (server) => {
      server.route([
        {
          method: 'POST',
          path: '/land-area/{landParcelId}',
          ...LandAreaController
        }
      ])
    }
  }
}

export { landdata, landarea }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
