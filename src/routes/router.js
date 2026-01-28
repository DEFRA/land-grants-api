import { health } from './health/index.js'
import { parcel } from '../features/parcel/index.js'
import { payments } from '../features/payment/index.js'
import { application } from '../features/application/index.js'
import { caseManagementAdapter } from '~/src/features/case-management-adapter/index.js'
import { landDataIngest } from '~/src/features/land-data-ingest/index.js'
import { statistics } from '~/src/features/statistics/index.js'

/**
 * @satisfies { import('@hapi/hapi').ServerRegisterPluginObject<*> }
 */
const router = {
  plugin: {
    name: 'Router',
    register: async (server) => {
      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // Application specific routes
      await server.register([parcel])
      await server.register([payments])
      await server.register([application])
      await server.register([caseManagementAdapter])
      await server.register([landDataIngest])
      await server.register([statistics])
    }
  }
}

export { router }
