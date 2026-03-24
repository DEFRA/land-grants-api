import { ValidateWMPController } from './controller/validate-wmp.controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const woodlandManagement = {
  plugin: {
    name: 'wmp',
    register: (server) => {
      server.route([
        {
          method: 'POST',
          path: '/validate-wmp',
          ...ValidateWMPController
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
