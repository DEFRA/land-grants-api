import { IngestScheduleController } from '~/src/api/ingest-schedule/controllers/ingest-schedule.controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const ingestSchedule = {
  plugin: {
    name: 'ingest',
    register: (server) => {
      server.route({
        method: 'GET',
        path: '/ingest-land-data-schedule',
        ...IngestScheduleController
      })
    }
  }
}

export { ingestSchedule }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
