import { getActionController } from './controllers/get-action-controller.js'
import { getAllActionsController } from './controllers/get-all-actions-controller.js'
import { actionValidationController } from './controllers/action-validation-controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const action = {
  plugin: {
    name: 'action',
    register: (server) => {
      server.route([
        {
          method: 'POST',
          path: '/action-validation',
          ...actionValidationController
        },
        {
          method: 'GET',
          path: '/action/{actionCode}',
          ...getActionController
        },
        {
          method: 'GET',
          path: '/actions',
          ...getAllActionsController
        }
      ])
    }
  }
}

export { action }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
