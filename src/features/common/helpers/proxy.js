import { URL } from 'node:url'
import { ProxyAgent } from 'undici'
import { HttpsProxyAgent } from 'https-proxy-agent'

import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/features/common/helpers/logging/logger.js'

const logger = createLogger()
/**
 * @typedef Proxy
 * @property {URL} url
 * @property {number} port
 * @property {ProxyAgent} proxyAgent
 * @property {HttpsProxyAgent<string>} httpAndHttpsProxyAgent
 */

/** @type {Proxy|null} */
let cachedProxy = null
/** @type {string|null} */
let cachedProxyUrl = null

/**
 * Provide ProxyAgent and HttpsProxyAgent when http/s proxy url config has been set.
 * Returns a lazily-initialised singleton to avoid creating a new ProxyAgent (and
 * its underlying undici connection pool) on every request, which causes
 * EventEmitter MaxListenersExceeded warnings from leaked socket connect listeners.
 * @returns {Proxy|null}
 */
function provideProxy() {
  const proxyUrl = config.get('httpsProxy') ?? config.get('httpProxy')

  if (!proxyUrl) {
    cachedProxy = null
    cachedProxyUrl = null
    return null
  }

  if (cachedProxy && cachedProxyUrl === proxyUrl) {
    return cachedProxy
  }

  const url = new URL(proxyUrl)
  const httpPort = 80
  const httpsPort = 443
  // The url.protocol value always has a colon at the end
  const port = url.protocol.toLowerCase() === 'http:' ? httpPort : httpsPort

  logger.debug(`Proxy set up using ${url.origin}:${port}`)

  cachedProxyUrl = proxyUrl
  cachedProxy = {
    url,
    port,
    proxyAgent: new ProxyAgent({
      uri: proxyUrl,
      keepAliveTimeout: 10,
      keepAliveMaxTimeout: 10
    }),
    httpAndHttpsProxyAgent: new HttpsProxyAgent(url)
  }

  return cachedProxy
}

/**
 * Provide fetch with dispatcher ProxyAgent when http/s proxy url config has been set
 * @param {string | URL } url
 * @param {RequestInit} options
 * @returns {Promise}
 */
function proxyFetch(url, options) {
  const proxy = provideProxy()

  if (!proxy) {
    return fetch(url, options)
  }

  logger.debug(
    `Fetching: ${url.toString()} via the proxy: ${proxy?.url.origin}:${proxy.port}`
  )

  return fetch(url, {
    ...options,
    // @ts-expect-error - dispatcher
    dispatcher: proxy.proxyAgent
  })
}

export { proxyFetch, provideProxy }
