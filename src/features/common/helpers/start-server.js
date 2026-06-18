import { config } from '~/src/config/index.js'

import { createServer } from '~/src/routes/index.js'
import { createLogger } from '~/src/features/common/helpers/logging/logger.js'

async function startServer() {
  let server

  try {
    server = await createServer()
    await server.start()

    server.logger.info('Server started successfully')
    server.logger.info(
      `Access your backend on http://localhost:${config.get('port')}`
    )
  } catch (error) {
    const logger = createLogger()
    logger.info('Server failed to start :(')
    logger.error(error)
    // eslint-disable-next-line n/no-process-exit
    process.exit(1)
  }

  return server
}

export { startServer }
