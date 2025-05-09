import Inert from '@hapi/inert'
import Vision from '@hapi/vision'
import HapiSwagger from 'hapi-swagger'

import { config } from '~/src/config/index.js'

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
            security: [{ jwt: [] }],
            securityDefinitions: {
              jwt: {
                type: 'apiKey',
                name: 'Authorization',
                in: 'header',
                description: 'Enter your JWT token without any prefix'
              }
            },
            info: {
              title: 'Land Grants API',
              version: config.serviceVersion
            },
            swaggerUI: !config.isProduction,
            documentationPage: !config.isProduction
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
