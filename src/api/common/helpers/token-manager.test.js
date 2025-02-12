const mockFetch = jest.fn()
jest.mock('node-fetch', () => mockFetch)

jest.mock('~/src/config/index.js', () => ({
  config: {
    get: jest.fn((key) => {
      const mockConfig = {
        'entra.tokenEndpoint': 'https://login.microsoftonline.com',
        'entra.tenantId': 'mock-tenant-id',
        'entra.clientId': 'mock-client-id',
        'entra.clientSecret': 'mock-client-secret'
      }
      return mockConfig[key]
    })
  }
}))

describe('Token Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
  })

  describe('isTokenExpired', () => {
    test('returns true when no expiry time provided', async () => {
      const { isTokenExpired } = await import('./token-manager.js')
      expect(isTokenExpired(null)).toBe(true)
      expect(isTokenExpired(undefined)).toBe(true)
    })

    test('returns true when token is expired', async () => {
      const { isTokenExpired } = await import('./token-manager.js')
      const expiredTime = Date.now() - 1000 // 1 second ago
      expect(isTokenExpired(expiredTime)).toBe(true)
    })

    test('returns true when token expires within 5 minutes', async () => {
      const { isTokenExpired } = await import('./token-manager.js')
      const almostExpiredTime = Date.now() + 4 * 60 * 1000 // 4 minutes from now
      expect(isTokenExpired(almostExpiredTime)).toBe(true)
    })

    test('returns false when token is valid and not near expiry', async () => {
      const { isTokenExpired } = await import('./token-manager.js')
      const validTime = Date.now() + 10 * 60 * 1000 // 10 minutes from now
      expect(isTokenExpired(validTime)).toBe(false)
    })
  })

  describe('createTokenRequestParams', () => {
    test('creates correct URL search params', async () => {
      const { createTokenRequestParams } = await import('./token-manager.js')
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

  describe('refreshToken', () => {
    test('successfully refreshes token', async () => {
      const mockToken = 'new-access-token'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: mockToken,
            expires_in: 3600
          })
      })

      const { refreshToken } = await import('./token-manager.js')
      const token = await refreshToken()

      expect(token).toBe(mockToken)

      const [[calledUrl, calledOptions]] = mockFetch.mock.calls

      expect(calledUrl).toBe(
        'https://login.microsoftonline.com/mock-tenant-id/oauth2/v2.0/token'
      )
      expect(calledOptions.method).toBe('POST')
      expect(calledOptions.headers['Content-Type']).toBe(
        'application/x-www-form-urlencoded'
      )

      const bodyParams = new URLSearchParams(calledOptions.body)
      expect(Object.fromEntries(bodyParams)).toEqual({
        client_id: 'mock-client-id',
        scope: 'api://mock-client-id/.default',
        client_secret: 'mock-client-secret',
        grant_type: 'client_credentials'
      })
    })

    test('throws error when token refresh fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            error: 'invalid_request',
            error_description: 'Invalid credentials'
          })
      })

      const { refreshToken } = await import('./token-manager.js')
      await expect(refreshToken()).rejects.toThrow(
        'Token refresh failed: Invalid credentials'
      )
    })

    test('throws error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { refreshToken } = await import('./token-manager.js')
      await expect(refreshToken()).rejects.toThrow(
        'Failed to refresh token: Network error'
      )
    })
  })

  describe('getValidToken', () => {
    test('returns existing token if not expired', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'new-access-token',
            expires_in: 3600
          })
      })

      const { getValidToken } = await import('./token-manager.js')

      const firstToken = await getValidToken()
      expect(firstToken).toBe('new-access-token')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      const secondToken = await getValidToken()
      expect(secondToken).toBe('new-access-token')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    test('refreshes token if expired', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'expired-token',
            expires_in: 0
          })
      })

      const { getValidToken } = await import('./token-manager.js')

      const firstToken = await getValidToken()
      expect(firstToken).toBe('expired-token')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'new-access-token',
            expires_in: 3600
          })
      })

      const newToken = await getValidToken()
      expect(newToken).toBe('new-access-token')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })
})
