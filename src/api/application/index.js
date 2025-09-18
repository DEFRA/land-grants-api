import { ApplicationValidationController } from './controllers/application-validation.controller.js'
import { ApplicationValidationRunController } from './controllers/application-validation-run.controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const application = {
  plugin: {
    name: 'application',
    register: (server) => {
      server.route([
        {
          method: 'POST',
          path: '/application/validate',
          ...ApplicationValidationController
        },
        {
          method: 'POST',
          path: '/application/validation-run/{id}',
          ...ApplicationValidationRunController
        }
      ])
    }
  }
}

export { application }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
