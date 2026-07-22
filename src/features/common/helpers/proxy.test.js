import { vi, describe, test, beforeEach, afterEach, expect } from 'vitest'
import { ProxyAgent } from 'undici'

import { config } from '~/src/config/index.js'
import { proxyFetch } from '~/src/features/common/helpers/proxy.js'

const { fetchMock } = global

const mockLoggerDebug = vi.fn()
vi.mock('~/src/features/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ debug: (...args) => mockLoggerDebug(...args) })
}))

const httpProxyUrl = 'http://proxy.example.com'
const httpsProxyUrl = 'https://proxy.example.com'
const httpPort = 80
const httpsPort = 443
const secureUrl = 'https://beepboopbeep.com'

describe('#proxy', () => {
  beforeEach(() => {
    fetchMock.enableMocks()
  })

  afterEach(() => {
    fetchMock.disableMocks()
    config.set('httpProxy', null)
    config.set('httpsProxy', null)
    vi.clearAllMocks()
  })

  describe('When no proxy is configured', () => {
    test('Should fetch without proxy agent', async () => {
      fetchMock.mockResponse(() => Promise.resolve({}))

      await proxyFetch(secureUrl, { method: 'GET' })

      expect(global.fetch).toHaveBeenCalledWith(secureUrl, { method: 'GET' })
    })

    test('Should pass options through', async () => {
      fetchMock.mockResponse(() => Promise.resolve({}))

      await proxyFetch(secureUrl, {})

      expect(global.fetch).toHaveBeenCalledWith(secureUrl, {})
    })
  })

  describe('When a HTTP proxy URL has been set', () => {
    test('Should fetch with proxy agent', async () => {
      config.set('httpProxy', httpProxyUrl)
      fetchMock.mockResponse(() => Promise.resolve({}))

      await proxyFetch(secureUrl, {})

      expect(global.fetch).toHaveBeenCalledWith(
        secureUrl,
        expect.objectContaining({
          dispatcher: expect.any(ProxyAgent)
        })
      )
    })

    test('Should log proxy setup and fetch via proxy messages', async () => {
      config.set('httpProxy', httpProxyUrl)
      fetchMock.mockResponse(() => Promise.resolve({}))

      await proxyFetch(secureUrl, {})

      expect(mockLoggerDebug).toHaveBeenCalledWith(
        `Proxy set up using ${httpProxyUrl}:${httpPort}`
      )
      expect(mockLoggerDebug).toHaveBeenCalledWith(
        `Fetching: ${secureUrl} via the proxy: ${httpProxyUrl}:${httpPort}`
      )
    })
  })

  describe('When a HTTPS proxy URL has been set', () => {
    test('Should fetch with proxy agent', async () => {
      config.set('httpsProxy', httpsProxyUrl)
      fetchMock.mockResponse(() => Promise.resolve({}))

      await proxyFetch(secureUrl, {})

      expect(global.fetch).toHaveBeenCalledWith(
        secureUrl,
        expect.objectContaining({
          dispatcher: expect.any(ProxyAgent)
        })
      )
    })

    test('Should log proxy setup and fetch via proxy messages', async () => {
      config.set('httpsProxy', httpsProxyUrl)
      fetchMock.mockResponse(() => Promise.resolve({}))

      await proxyFetch(secureUrl, {})

      expect(mockLoggerDebug).toHaveBeenCalledWith(
        `Proxy set up using ${httpsProxyUrl}:${httpsPort}`
      )
      expect(mockLoggerDebug).toHaveBeenCalledWith(
        `Fetching: ${secureUrl} via the proxy: ${httpsProxyUrl}:${httpsPort}`
      )
    })
  })
})
