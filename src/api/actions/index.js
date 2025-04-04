import {
  LandActionsPaymentController,
  LandActionsValidateController
} from './controllers/index.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const landactions = {
  plugin: {
    name: 'payment',
    register: (server) => {
      server.route([
        {
          method: 'POST',
          path: '/payment',
          ...LandActionsPaymentController
        },
        {
          method: 'POST',
          path: '/validate',
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
