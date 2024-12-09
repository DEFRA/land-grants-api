import { importOptionsController } from '~/src/api/import-data/controllers/index.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const importData = {
  plugin: {
    name: 'import-data',
    register: (server) => {
      server.route([
        {
          method: 'POST',
          path: '/import-data/options',
          options: {
            payload: {
              maxBytes: Number.MAX_SAFE_INTEGER
            }
          },
          ...importOptionsController
        }
      ])
    }
  }
}

export { importData }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
