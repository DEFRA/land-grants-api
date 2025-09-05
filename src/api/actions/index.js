import {
  LandActionsValidateController,
  ActionsController
} from './controllers/index.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const landactions = {
  plugin: {
    name: 'landactions',
    register: (server) => {
      server.route([
        {
          method: 'POST',
          path: '/actions/validate',
          ...LandActionsValidateController
        },
        {
          method: 'GET',
          path: '/actions',
          ...ActionsController
        }
      ])
    }
  }
}

export { landactions }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
