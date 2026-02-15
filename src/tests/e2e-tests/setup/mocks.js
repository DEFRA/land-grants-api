import { config } from '~/src/config/index.js'

const mocks = new Map([
  [
    config.get('ingest.endpoint'),
    {
      ok: true,
      json: () => Promise.resolve({ uploadUrl: '/upload/e2e-test' })
    }
  ]
])

export const mockApiCalls = () => {
  const originalFetch = globalThis.fetch

  globalThis.fetch = function (url, options) {
    const mock = mocks.get(url)
    if (mock) {
      return Promise.resolve(mock)
    }
    return originalFetch.call(this, url, options)
  }
}
