import Boom from '@hapi/boom'
import crypto from 'node:crypto'
import { auth } from './auth.js'
import { vi } from 'vitest'
import { config } from '~/src/config/index.js'

vi.mock('~/src/config/index.js', () => ({
  config: { get: vi.fn() }
}))

vi.mock('../helpers/logging/log-helpers.js', () => ({
  logBusinessError: vi.fn()
}))

vi.mock('~/src/features/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ error: vi.fn() })
}))

const VALID_TOKEN = 'my-service-token'
const ENCRYPTION_KEY = 'encryption-key-123456789012345678901234'

function encryptToken(token, encryptionKey) {
  const iv = crypto.randomBytes(12)
  const key = crypto.scryptSync(encryptionKey, 'salt', 32)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  let encrypted = cipher.update(token, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const authTag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

const createHMock = () => ({
  authenticated: vi.fn().mockReturnValue('ok')
})

function createAuthenticateFn() {
  let authenticateFn
  const fakeServer = {
    auth: {
      scheme: (name, impl) => {
        const schemeImpl = impl()
        authenticateFn = schemeImpl.authenticate
      },
      strategy: vi.fn(),
      default: vi.fn()
    }
  }
  auth.plugin.register(fakeServer)
  return authenticateFn
}

describe('auth plugin', () => {
  describe('authenticate', () => {
    it('authenticates successfully with valid token', async () => {
      const encrypted = encryptToken(VALID_TOKEN, ENCRYPTION_KEY)
      const encodedHeader = Buffer.from(encrypted).toString('base64')

      config.get.mockImplementation((key) => {
        if (key === 'auth.token') return VALID_TOKEN
        if (key === 'auth.encryptionKey') return ENCRYPTION_KEY
      })

      const request = { headers: { authorization: `Bearer ${encodedHeader}` } }
      const h = createHMock()
      const authenticateFn = createAuthenticateFn()

      const result = await authenticateFn(request, h)
      expect(result).toBe('ok')
      expect(h.authenticated).toHaveBeenCalledWith({
        credentials: { authenticated: true }
      })
    })

    it('throws Boom.unauthorized when Authorization header is missing', async () => {
      config.get.mockImplementation((key) => {
        if (key === 'auth.token') return VALID_TOKEN
        if (key === 'auth.encryptionKey') return ENCRYPTION_KEY
      })

      const request = { headers: {} }
      const h = createHMock()
      const authenticateFn = createAuthenticateFn()

      await expect(authenticateFn(request, h)).rejects.toThrow(Boom.Boom)
    })

    it('throws Boom.unauthorized when server token is not configured', async () => {
      config.get.mockImplementation((key) => {
        if (key === 'auth.token') return undefined
        if (key === 'auth.encryptionKey') return ENCRYPTION_KEY
      })

      const request = { headers: { authorization: 'Bearer xyz' } }
      const h = createHMock()
      const authenticateFn = createAuthenticateFn()

      await expect(authenticateFn(request, h)).rejects.toThrow(Boom.Boom)
    })

    it('throws Boom.unauthorized when encryption key is not configured', async () => {
      config.get.mockImplementation((key) => {
        if (key === 'auth.token') return VALID_TOKEN
        if (key === 'auth.encryptionKey') return undefined
      })

      const request = { headers: { authorization: 'Bearer xyz' } }
      const h = createHMock()
      const authenticateFn = createAuthenticateFn()

      await expect(authenticateFn(request, h)).rejects.toThrow(Boom.Boom)
    })

    it('throws Boom.unauthorized for token mismatch', async () => {
      const encrypted = encryptToken('wrong-token', ENCRYPTION_KEY)
      const encodedHeader = Buffer.from(encrypted).toString('base64')
      config.get.mockImplementation((key) => {
        if (key === 'auth.token') return VALID_TOKEN
        if (key === 'auth.encryptionKey') return ENCRYPTION_KEY
      })

      const request = { headers: { authorization: `Bearer ${encodedHeader}` } }
      const h = createHMock()
      const authenticateFn = createAuthenticateFn()

      await expect(authenticateFn(request, h)).rejects.toThrow(Boom.Boom)
    })

    it('throws Boom.unauthorized for malformed token', async () => {
      config.get.mockReturnValue(ENCRYPTION_KEY)

      const request = { headers: { authorization: 'Bearer badtoken' } }
      const h = createHMock()
      const authenticateFn = createAuthenticateFn()

      await expect(authenticateFn(request, h)).rejects.toThrow(Boom.Boom)
    })
  })
})
