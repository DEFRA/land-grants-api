import { getActionController } from './controllers/get-action-controller.js'
import { getAllActionsController } from './controllers/get-all-actions-controller.js'
import { postActionRuleController } from './controllers/post-action-rule-controller.js'
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
        },
        {
          method: 'POST',
          path: '/action/{actionCode}/rule',
          ...postActionRuleController
        }
      ])
    }
  }
}

export { action }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
