import {
  clearTokenState,
  createTokenRequestParams,
  isTokenExpired
} from '~/src/api/common/helpers/entra/token-manager.js'
import { config } from '~/src/config/index.js'

const mockFetch = jest.fn()
global.fetch = mockFetch

describe('Token Manager', () => {
  beforeEach(() => {
    config.set('entra', {
      tokenEndpoint: 'https://login.microsoftonline.com',
      tenantId: 'mock-tenant-id',
      clientId: 'mock-client-id',
      clientSecret: 'mock-client-secret'
    })
    clearTokenState()
  })

  describe('isTokenExpired', () => {
    test('returns true when no expiry time provided', () => {
      expect(isTokenExpired(null)).toBe(true)
    })

    test('returns true when token is expired', () => {
      const expiredTime = Date.now() - 1000 // 1 second ago
      expect(isTokenExpired(expiredTime)).toBe(true)
    })

    test('returns true when token expires within 5 minutes', () => {
      const almostExpiredTime = Date.now() + 4 * 60 * 1000 // 4 minutes from now
      expect(isTokenExpired(almostExpiredTime)).toBe(true)
    })

    test('returns false when token is valid and not near expiry', () => {
      const validTime = Date.now() + 10 * 60 * 1000 // 10 minutes from now
      expect(isTokenExpired(validTime)).toBe(false)
    })
  })

  describe('createTokenRequestParams', () => {
    test('creates correct URL search params', () => {
      const params = createTokenRequestParams(
        'client-id',
        'test-scope',
        'secret'
      )
      const paramsObject = Object.fromEntries(params)

      expect(paramsObject).toEqual({
        client_id: 'client-id',
        scope: 'test-scope',
        client_secret: 'secret',
        grant_type: 'client_credentials'
      })
    })
  })
})
