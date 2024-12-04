import { availableAreaController } from '~/src/api/available-area/controllers/post-available-area-controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const availableArea = {
  plugin: {
    name: 'available-area',
    register: (server) => {
      server.route([
        {
          method: 'POST',
          path: '/available-area',
          ...availableAreaController
        }
      ])
    }
  }
}

export { availableArea }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
