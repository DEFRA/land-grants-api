import { createLogger } from '~/src/helpers/logging/logger.js'

const logger = createLogger()

/**
 *
 * @param { import('@hapi/hapi').Server } server
 * @param { string } segment
 * @param { Function } generateFunc
 * @param { any } [options]
 * @returns { import('@hapi/catbox').Policy<any, any> }
 */
export function initCache(server, segment, generateFunc, options = {}) {
  logger.info(`Initialising ${segment} cache`)
  return server.cache({
    cache: 'frps',
    segment,
    expiresIn: 10 * 1000,
    generateTimeout: 2000,
    generateFunc,
    ...options
  })
}
