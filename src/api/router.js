import { health } from '~/src/api/health/index.js'
import { landactions } from './actions/index.js'
import { parcel } from './parcel/index.js'
import { postgresTest } from './postgresTest/index.js'

/**
 * @satisfies { import('@hapi/hapi').ServerRegisterPluginObject<*> }
 */
const router = {
  plugin: {
    name: 'Router',
    register: async (server) => {
      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // Application specific routes, add your own routes here.
      await server.register([postgresTest])
      await server.register([parcel])
      await server.register([landactions])
    }
  }
}

export { router }
