import hapi from '@hapi/hapi'
import path from 'path'

import { failAction } from '~/src/api/common/helpers/fail-action.js'
import { requestLogger } from '~/src/api/common/helpers/logging/request-logger.js'
import { pulse } from '~/src/api/common/helpers/pulse.js'
import { requestTracing } from '~/src/api/common/helpers/request-tracing.js'
import { secureContext } from '~/src/api/common/helpers/secure-context/index.js'
import { swagger } from '~/src/api/common/plugins/swagger.js'
import { router } from '~/src/api/router.js'
import { config } from '~/src/config/index.js'
import { postgresDb } from './common/helpers/postgres.js'
import { auth } from './common/plugins/auth.js'
import { s3Client } from './common/plugins/s3-client.js'

async function createServer() {
  const server = hapi.server({
    port: config.get('port'),
    routes: {
      validate: {
        options: {
          abortEarly: false
        },
        failAction
      },
      files: {
        relativeTo: path.resolve(config.get('root'), '.public')
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: {
      stripTrailingSlash: true
    }
  })

  // Hapi Plugins:
  // requestLogger  - automatically logs incoming requests
  // requestTracing - trace header logging and propagation
  // secureContext  - loads CA certificates from environment config
  // pulse          - provides shutdown handlers
  // auth           - provides service-to-service authentication
  // router         - routes used in the app
  // swagger        - swagger documentation
  await server.register([
    requestLogger,
    requestTracing,
    secureContext,
    pulse,
    postgresDb,
    auth,
    router,
    s3Client
  ])

  // Register swagger separately as it needs Inert and Vision plugins
  await swagger.plugins.register(server)

  return server
}

export { createServer }
