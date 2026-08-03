import { CaseManagementApplicationValidationRunController } from './controllers/case-management-application-validation-run.controller.js'
import { CaseManagementApplicationValidationController } from './controllers/case-management-application-validation.controller.js'

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
        },
        {
          method: 'POST',
          path: '/case-management-adapter/application/validation-run/rerun',
          ...CaseManagementApplicationValidationController
        }
      ])
    }
  }
}

export { caseManagementAdapter }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
