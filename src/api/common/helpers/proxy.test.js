import { vi, describe, test, beforeEach, afterEach, expect } from 'vitest'
import { ProxyAgent } from 'undici'

import { config } from '~/src/config/index.js'
import { provideProxy, proxyFetch } from '~/src/api/common/helpers/proxy.js'

// fetchMock is made available globally via .vitest/setup.js
const { fetchMock } = global

const mockLoggerDebug = vi.fn()
vi.mock('~/src/api/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ debug: (...args) => mockLoggerDebug(...args) })
}))

const httpProxyUrl = 'http://proxy.example.com'
const httpsProxyUrl = 'https://proxy.example.com'
const httpPort = 80
const httpsPort = 443

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

  describe('#provideProxy', () => {
    describe('When a Proxy URL has not been set', () => {
      test('Should return null', () => {
        expect(provideProxy()).toBeNull()
      })
    })

    describe('When a HTTP Proxy URL has been set', () => {
      let result

      beforeEach(() => {
        config.set('httpProxy', httpProxyUrl)
        result = provideProxy()
      })

      test('Should make expected set up message', () => {
        expect(mockLoggerDebug).toHaveBeenCalledWith(
          `Proxy set up using ${httpProxyUrl}:${httpPort}`
        )
      })

      test('Should set the correct port for HTTP', () => {
        expect(result).toHaveProperty('port', httpPort)
      })

      test('Should return expected HTTP Proxy object', () => {
        expect(result).toHaveProperty('url')
        expect(result).toHaveProperty('proxyAgent')
        expect(result).toHaveProperty('httpAndHttpsProxyAgent')
      })
    })

    describe('When a HTTPS Proxy URL has been set', () => {
      let result

      beforeEach(() => {
        config.set('httpsProxy', httpsProxyUrl)
        result = provideProxy()
      })

      test('Should call debug with expected message', () => {
        expect(mockLoggerDebug).toHaveBeenCalledWith(
          `Proxy set up using ${httpsProxyUrl}:${httpsPort}`
        )
      })

      test('Should set the correct port for HTTPS', () => {
        expect(result).toHaveProperty('port', httpsPort)
      })

      test('Should return expected HTTPS Proxy object', () => {
        expect(result).toHaveProperty('url')
        expect(result).toHaveProperty('proxyAgent')
        expect(result).toHaveProperty('httpAndHttpsProxyAgent')
      })
    })
  })

  describe('#proxyFetch', () => {
    const secureUrl = 'https://beepboopbeep.com'

    test('Should pass options through', async () => {
      fetchMock.mockResponse(() => Promise.resolve({}))

      await proxyFetch(secureUrl, { method: 'GET' })

      expect(global.fetch).toHaveBeenCalledWith(secureUrl, { method: 'GET' })
    })

    describe('When no Proxy is configured', () => {
      test('Should fetch without Proxy Agent', async () => {
        fetchMock.mockResponse(() => Promise.resolve({}))

        await proxyFetch(secureUrl, {})

        expect(global.fetch).toHaveBeenCalledWith(secureUrl, {})
      })
    })

    describe('When proxy is configured', () => {
      beforeEach(async () => {
        config.set('httpProxy', httpsProxyUrl)
        fetchMock.mockResponse(() => Promise.resolve({}))

        await proxyFetch(secureUrl, {})
      })

      test('Should fetch with Proxy Agent', () => {
        expect(global.fetch).toHaveBeenCalledWith(
          secureUrl,
          expect.objectContaining({
            dispatcher: expect.any(ProxyAgent)
          })
        )
      })

      test('Should make expected set up message', () => {
        expect(mockLoggerDebug).toHaveBeenNthCalledWith(
          1,
          `Proxy set up using ${httpsProxyUrl}:${httpsPort}`
        )
      })

      test('Should make expected fetching via the proxy message', () => {
        expect(mockLoggerDebug).toHaveBeenNthCalledWith(
          2,
          `Fetching: ${secureUrl.toString()} via the proxy: ${httpsProxyUrl}:${httpsPort}`
        )
      })
    })
  })
})
