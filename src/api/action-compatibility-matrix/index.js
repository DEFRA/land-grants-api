import { findCompatibleActions } from '~/src/api/action-compatibility-matrix/controllers/index.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const actionCompatibilityMatrix = {
  plugin: {
    name: 'compatibility-matrix',
    register: (server) => {
      server.route([
        {
          method: 'GET',
          path: '/compatibility-matrix/{action}',
          ...findCompatibleActions
        }
      ])
    }
  }
}

export { actionCompatibilityMatrix }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
