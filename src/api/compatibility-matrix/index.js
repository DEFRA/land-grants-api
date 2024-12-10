import { findCompatibleActions } from '~/src/api/compatibility-matrix/controllers/index.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const compatibilityMatrix = {
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

export { compatibilityMatrix }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
