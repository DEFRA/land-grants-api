import { ApplicationValidationController } from './controllers/1.0.0/application-validation.controller.js'
import { ApplicationValidationController as ApplicationValidationControllerV2 } from './controllers/2.0.0/application-validation.controller.js'
import { ApplicationValidationRunController } from './controllers/1.0.0/application-validation-run.controller.js'
import { ApplicationValidationRunsController } from './controllers/1.0.0/application-validation-runs.controller.js'

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
          path: '/api/v2/application/validate',
          ...ApplicationValidationControllerV2
        },
        {
          method: 'POST',
          path: '/application/validation-run/{id}',
          ...ApplicationValidationRunController
        },
        {
          method: 'POST',
          path: '/application/{applicationId}/validation-run',
          ...ApplicationValidationRunsController
        }
      ])
    }
  }
}

export { application }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
