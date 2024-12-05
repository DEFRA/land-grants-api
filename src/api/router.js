import { health } from '~/src/api/health/index.js'
import { example } from '~/src/api/example/index.js'
import { importData } from '~/src/api/import-data/index.js'
import { actionCompatibilityMatrix } from '~/src/api/action-compatibility-matrix/index.js'
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

      // Import data endpoints
      await server.register([importData])

      // Get Action compatibility matrix
      await server.register([actionCompatibilityMatrix])

      // Get Actions
      await server.register([action])

      // Get Available Area
      await server.register([availableArea])

      // Land - Parcels, Cover
      await server.register([land])

      // Payment Calculation
      await server.register([paymentCalculation])

      // Application specific routes, add your own routes here.
      await server.register([example])
    }
  }
}

export { router }
