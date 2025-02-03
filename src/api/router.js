import { business } from '~/src/api/business/index.js'
import { example } from '~/src/api/example/index.js'
import { health } from '~/src/api/health/index.js'

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
      await server.register([example])
      await server.register([business])
    }
  }
}

export { router }
