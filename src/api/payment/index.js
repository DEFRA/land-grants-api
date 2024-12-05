import { paymentCalculationController } from './controllers/index.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const paymentCalculation = {
  plugin: {
    name: 'payment-calculation',
    register: (server) => {
      server.route([
        {
          method: 'POST',
          path: '/payment-calculation',
          ...paymentCalculationController
        }
      ])
    }
  }
}

export { paymentCalculation }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
