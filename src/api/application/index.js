import { ApplicationValidationController } from './controllers/application-validation.controller.js'

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
        }
      ])
    }
  }
}

export { application }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
