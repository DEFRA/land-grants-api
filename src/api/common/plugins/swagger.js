import HapiSwagger from 'hapi-swagger'
import Inert from '@hapi/inert'
import Vision from '@hapi/vision'

import { config } from '~/src/config/index.js'

const isProduction = config.get('isProduction')
const serviceVersion = config.get('serviceVersion')

/**
 * Registers Swagger UI plugins (Inert, Vision, and HapiSwagger)
 */
const swagger = {
  plugins: {
    register: async (server) => {
      await server.register([
        Inert,
        Vision,
        {
          plugin: HapiSwagger,
          options: {
            definitionPrefix: 'useLabel',
            info: {
              title: 'Land Grants API',
              version: serviceVersion
            },
            swaggerUI: !isProduction,
            documentationPage: !isProduction
          }
        }
      ])
    },
    name: 'swagger-documentation'
  }
}

export { swagger }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 * @import { Options } from 'hapi-swagger'
 */
