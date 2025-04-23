import hapi from '@hapi/hapi'
import path from 'path'

import { failAction } from '~/src/api/common/helpers/fail-action.js'
import { requestLogger } from '~/src/api/common/helpers/logging/request-logger.js'
import { mongooseDb } from '~/src/api/common/helpers/mongoose.js'
import { postgresDb } from '~/src/api/common/helpers/postgres.js'
import { pulse } from '~/src/api/common/helpers/pulse.js'
import { requestTracing } from '~/src/api/common/helpers/request-tracing.js'
import { secureContext } from '~/src/api/common/helpers/secure-context/index.js'
import { router } from '~/src/api/router.js'
import { config } from '~/src/config/index.js'

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
  // mongooseDb     - sets up mongoose connection pool and attaches to `server` and `request` objects
  // router         - routes used in the app
  await server.register([
    requestLogger,
    requestTracing,
    secureContext,
    pulse,
    mongooseDb,
    postgresDb,
    router
  ])

  return server
}

export { createServer }
