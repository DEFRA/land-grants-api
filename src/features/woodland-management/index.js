import { ValidateWMPController } from './controller/validate-wmp.controller.js'
import { PaymentsCalculateWMPController } from './controller/payment-calculate-wmp.controller.js'
import { PaymentsCalculateTotalWMPController } from './controller/payment-calculate-by-total-area-wmp.controller.js'

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
          path: '/api/v1/wmp/validate',
          ...ValidateWMPController
        },
        {
          method: 'POST',
          path: '/api/v1/wmp/payments/calculate',
          ...PaymentsCalculateWMPController
        },
        {
          method: 'POST',
          path: '/api/v1/wmp/payments/calculate-by-total-area',
          ...PaymentsCalculateTotalWMPController
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
