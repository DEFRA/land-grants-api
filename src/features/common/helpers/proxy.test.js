import { vi, describe, test, beforeEach, afterEach, expect } from 'vitest'
import { ProxyAgent } from 'undici'

import { config } from '~/src/config/index.js'
import { proxyFetch } from '~/src/features/common/helpers/proxy.js'

// fetchMock is made available globally via .vitest/setup.js
const { fetchMock } = global

const mockLoggerDebug = vi.fn()
vi.mock('~/src/features/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ debug: (...args) => mockLoggerDebug(...args) })
}))

const httpsProxyUrl = 'https://proxy.example.com'
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

      test('Should make expected fetching via the proxy message', () => {
        expect(mockLoggerDebug).toHaveBeenCalledWith(
          `Fetching: ${secureUrl.toString()} via the proxy: ${httpsProxyUrl}:${httpsPort}`
        )
      })
    })
  })
})
