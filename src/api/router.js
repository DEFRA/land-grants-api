import { health } from '~/src/api/health/index.js'
import { compatibilityMatrix } from '~/src/api/compatibility-matrix/index.js'
import { action } from '~/src/api/action/index.js'
import { land } from '~/src/api/land/index.js'
import { availableArea } from '~/src/api/available-area/index.js'
import { paymentCalculation } from '~/src/api/payment/index.js'

/**
 * @satisfies { import('@hapi/hapi').ServerRegisterPluginObject<*> }
 */
const router = {
  plugin: {
    name: 'Router',
    register: async (server) => {
      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // Get Action compatibility matrix
      await server.register([compatibilityMatrix])

      // Get Actions
      await server.register([action])

      // Get Available Area
      await server.register([availableArea])

      // Land - Parcels, Cover
      await server.register([land])

      // Payment Calculation
      await server.register([paymentCalculation])
    }
  }
}

export { router }
