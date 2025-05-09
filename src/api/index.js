import hapi from '@hapi/hapi'
import hapiAuthJwt2 from 'hapi-auth-jwt2'
import path from 'path'

import { failAction } from '~/src/api/common/helpers/fail-action.js'
import { requestLogger } from '~/src/api/common/helpers/logging/request-logger.js'
import { mongooseDb } from '~/src/api/common/helpers/mongoose.js'
import { pulse } from '~/src/api/common/helpers/pulse.js'
import { requestTracing } from '~/src/api/common/helpers/request-tracing.js'
import { secureContext } from '~/src/api/common/helpers/secure-context/index.js'
import { swagger } from '~/src/api/common/plugins/swagger.js'
import { router } from '~/src/api/router.js'
import { config } from '~/src/config/index.js'
import { postgresDb } from './common/helpers/postgres.js'

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
  // hapiAuthJwt2   - JWT authentication
  // requestLogger  - automatically logs incoming requests
  // requestTracing - trace header logging and propagation
  // secureContext  - loads CA certificates from environment config
  // pulse          - provides shutdown handlers
  // mongooseDb     - sets up mongoose connection pool and attaches to `server` and `request` objects
  // router         - routes used in the app
  // swagger        - swagger documentation
  await server.register([
    hapiAuthJwt2,
    requestLogger,
    requestTracing,
    secureContext,
    pulse,
    mongooseDb,
    postgresDb,
    router
  ])

  // Register swagger separately as it needs Inert and Vision plugins
  await swagger.plugins.register(server)

  // JWT validation function
  const validate = (decoded) => {
    // Perform any additional validation logic here
    if (decoded?.service !== 'grants-ui') {
      return { isValid: false }
    }
    return { isValid: true }
  }

  // Set up the JWT authentication strategy
  server.auth.strategy('jwt', 'jwt', {
    key: config.get('grantsUi.publicKey'),
    validate,
    verifyOptions: { algorithms: ['RS256'] }
  })

  // Set the default authentication strategy
  server.auth.default('jwt')

  return server
}

export { createServer }
