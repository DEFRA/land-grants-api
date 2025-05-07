import { LandActionsValidateController } from './controllers/actions-validation.controller.js'

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
        }
      ])
    }
  }
}

export { landactions }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
