import { ValidateWMPController } from './controller/validate-wmp.controller.js'
import { PaymentsCalculateWMPControllerV2 } from './controller/payment-calculate-wmp.controller.js'

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
          ...PaymentsCalculateWMPControllerV2
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
