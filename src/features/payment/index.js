import { PaymentsCalculateControllerV2 } from './controllers/index.js'

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
          path: '/api/v2/payments/calculate',
          ...PaymentsCalculateControllerV2
        }
      ])
    }
  }
}

export { payments }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
