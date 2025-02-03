import { findBusinessController } from '~/src/api/business/controllers/index.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const business = {
  plugin: {
    name: 'business',
    register: (server) => {
      server.route([
        {
          method: 'GET',
          path: '/business/{sbi}',
          ...findBusinessController
        }
      ])
    }
  }
}

export { business }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
