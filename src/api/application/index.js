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
          method: 'GET',
          path: '/application/{id}/validation-run',
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
