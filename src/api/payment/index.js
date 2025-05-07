import { PaymentsCalculateController } from './controllers/index.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const payments = {
  plugin: {
    name: 'payments',
    register: (server) => {
      server.route([
        {
          method: 'POST',
          path: '/payments/calculate',
          ...PaymentsCalculateController
        }
      ])
    }
  }
}

export { payments }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
