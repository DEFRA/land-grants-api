import hapi from '@hapi/hapi'
import path from 'path'

import { failAction } from '~/src/features/common/helpers/fail-action.js'
import { requestLogger } from '~/src/features/common/helpers/logging/request-logger.js'
import { pulse } from '~/src/features/common/helpers/pulse.js'
import { requestTracing } from '~/src/features/common/helpers/request-tracing.js'
import { secureContext } from '~/src/features/common/helpers/secure-context/index.js'
import { swagger } from '~/src/features/common/plugins/swagger.js'
import { router } from './router.js'
import { config } from '~/src/config/index.js'
import { postgresDb } from '~/src/features/common/helpers/postgres.js'
import { auth } from '~/src/features/common/plugins/auth.js'
import { s3Client } from '~/src/features/common/plugins/s3-client.js'
import { cron } from '~/src/features/common/plugins/cron.js'

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
    s3Client,
    cron
  ])

  // Register swagger separately as it needs Inert and Vision plugins
  await swagger.plugins.register(server)

  return server
}

export { createServer }
