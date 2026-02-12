import Boom from '@hapi/boom'
import crypto from 'node:crypto'
import { auth, decryptToken, validateAuthToken } from './auth.js'
import { vi } from 'vitest'
import { config } from '~/src/config/index.js'
import { logBusinessError } from '../helpers/logging/log-helpers.js'

const mockLoggerError = vi.fn()

vi.mock('~/src/config/index.js', () => ({
  config: { get: vi.fn() }
}))

vi.mock('../helpers/logging/log-helpers.js', () => ({
  logBusinessError: vi.fn()
}))

vi.mock('~/src/features/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ error: (...args) => mockLoggerError(...args) })
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

describe('auth plugin', () => {
  describe('decryptToken', () => {
    it('decrypts a valid token successfully', async () => {
      const encrypted = encryptToken(VALID_TOKEN, ENCRYPTION_KEY)
      config.get.mockReturnValueOnce(ENCRYPTION_KEY)

      const decrypted = await decryptToken(encrypted)

      expect(decrypted).toBe(VALID_TOKEN)
    })

    it('returns null and logs error when encryption key is missing', async () => {
      config.get.mockReturnValueOnce(undefined)
      const result = await decryptToken('irrelevant')

      expect(result).toBeNull()
      expect(logBusinessError).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          operation: 'Decrypt token'
        })
      )
    })

    it('returns null when token format is invalid', async () => {
      config.get.mockReturnValue(ENCRYPTION_KEY)
      const result = await decryptToken('invalid-format')
      expect(result).toBeNull()
      expect(logBusinessError).toHaveBeenCalled()
    })
  })

  describe('validateAuthToken', () => {
    it('returns false when Authorization header missing', async () => {
      const result = await validateAuthToken(null)
      expect(result.isValid).toBe(false)
      expect(result.error).toMatch(/Missing/)
    })

    it('returns false when server token is missing', async () => {
      config.get.mockImplementation((key) => {
        if (key === 'auth.token') return undefined
        if (key === 'auth.encryptionKey') return ENCRYPTION_KEY
      })

      const result = await validateAuthToken('Bearer xyz')
      expect(result.isValid).toBe(false)
      expect(result.error).toMatch(/not configured/i)
    })

    it('returns false when encryption key missing', async () => {
      config.get.mockImplementation((key) => {
        if (key === 'auth.token') return VALID_TOKEN
        if (key === 'auth.encryptionKey') return undefined
      })

      const result = await validateAuthToken('Bearer xyz')
      expect(result.isValid).toBe(false)
      expect(result.error).toMatch(/encryption/i)
    })

    it('validates and returns true for a valid encrypted bearer token', async () => {
      const encrypted = encryptToken(VALID_TOKEN, ENCRYPTION_KEY)
      const encodedHeader = Buffer.from(encrypted).toString('base64')
      config.get.mockImplementation((key) => {
        if (key === 'auth.token') return VALID_TOKEN
        if (key === 'auth.encryptionKey') return ENCRYPTION_KEY
      })

      const result = await validateAuthToken(`Bearer ${encodedHeader}`)

      expect(result.isValid).toBe(true)
    })

    it('returns false for invalid bearer token mismatch', async () => {
      const encrypted = encryptToken('wrong-token', ENCRYPTION_KEY)
      const encodedHeader = Buffer.from(encrypted).toString('base64')
      config.get.mockImplementation((key) => {
        if (key === 'auth.token') return VALID_TOKEN
        if (key === 'auth.encryptionKey') return ENCRYPTION_KEY
      })

      const result = await validateAuthToken(`Bearer ${encodedHeader}`)

      expect(result.isValid).toBe(false)
      expect(result.error).toMatch(/Invalid bearer token/)
    })
  })

  describe('Hapi auth plugin integration', () => {
    it('authenticates successfully with valid token', async () => {
      const encrypted = encryptToken(VALID_TOKEN, ENCRYPTION_KEY)
      const encodedHeader = Buffer.from(encrypted).toString('base64')

      config.get.mockImplementation((key) => {
        if (key === 'auth.token') return VALID_TOKEN
        if (key === 'auth.encryptionKey') return ENCRYPTION_KEY
      })

      const request = { headers: { authorization: `Bearer ${encodedHeader}` } }
      const h = createHMock()

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

      const result = await authenticateFn(request, h)
      expect(result).toBe('ok')
      expect(h.authenticated).toHaveBeenCalledWith({
        credentials: { authenticated: true }
      })
    })

    it('throws Boom.unauthorized for invalid token', async () => {
      const request = { headers: { authorization: 'Bearer badtoken' } }
      config.get.mockReturnValue(ENCRYPTION_KEY)
      const h = createHMock()

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
      await expect(authenticateFn(request, h)).rejects.toThrow(Boom.Boom)
    })
  })
})
