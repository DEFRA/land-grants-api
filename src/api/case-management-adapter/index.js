import { ApplicationValidationRunController } from './controllers/case-management-application-validation-run.controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const application = {
  plugin: {
    name: 'case-management-adapter',
    register: (server) => {
      server.route([
        {
          method: 'GET',
          path: '/case-management-adapter/application/validation-run/{id}',
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
