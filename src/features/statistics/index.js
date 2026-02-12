import { StatisticsController } from './controllers/statistics.controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const statistics = {
  plugin: {
    name: 'statistics',
    register: (server) => {
      server.route([
        {
          method: 'GET',
          path: '/statistics',
          ...StatisticsController,
          options: {
            auth: false
          }
        }
      ])
    }
  }
}

export { statistics }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
