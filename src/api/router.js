import { health } from '~/src/api/health/index.js'
import { parcel } from './parcel/index.js'
import { payments } from './payment/index.js'
import { application } from './application/index.js'
import { caseManagementAdapter } from './case-management-adapter/index.js'
import { ingestSchedule } from './ingest-schedule/index.js'

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
      await server.register([parcel])
      await server.register([payments])
      await server.register([application])
      await server.register([caseManagementAdapter])
      await server.register([ingestSchedule])
    }
  }
}

export { router }
