import { CaseManagementApplicationValidationRunController } from './controllers/case-management-application-validation-run.controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const caseManagementAdapter = {
  plugin: {
    name: 'case-management-adapter',
    register: (server) => {
      server.route([
        {
          method: 'GET',
          path: '/case-management-adapter/application/validation-run/{id}',
          ...CaseManagementApplicationValidationRunController
        }
      ])
    }
  }
}

export { caseManagementAdapter }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
