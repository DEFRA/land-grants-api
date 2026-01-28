import Boom from '@hapi/boom'
import crypto from 'node:crypto'
import { config } from '~/src/config/index.js'
import { logBusinessError } from '../helpers/logging/log-helpers.js'
import { createLogger } from '../helpers/logging/logger.js'

const TOKEN_PARTS_COUNT = 3
const OPERATION_NAME = 'Validate auth token'
const logger = createLogger()

/**
 * Decrypts an encrypted bearer token using AES-256-GCM
 * @param {string} encryptedToken - Token in format: iv:authTag:encryptedData (base64)
 * @returns {string | null} Decrypted token
 */
function decryptToken(encryptedToken) {
  const encryptionKey = config.get('auth.encryptionKey')
  if (!encryptionKey) {
    logBusinessError(logger, {
      operation: 'Decrypt token',
      error: new Error('Encryption key not configured')
    })

    return null
  }

  try {
    const parts = encryptedToken.split(':')
    if (parts.length !== TOKEN_PARTS_COUNT) {
      throw new Error('Malformed encrypted token')
    }
    const [ivB64, authTagB64, encryptedData] = encryptedToken.split(':')
    if (!ivB64 || !authTagB64 || !encryptedData) {
      throw new Error('Invalid encrypted token format')
    }

    const iv = Buffer.from(ivB64, 'base64')
    const authTag = Buffer.from(authTagB64, 'base64')
    const key = crypto.scryptSync(encryptionKey, 'salt', 32)

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedData, 'base64', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    logBusinessError(logger, {
      operation: 'Token decryption failed',
      error
    })
    return null
  }
}

function validateAuthToken(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      isValid: false,
      error: 'Missing or invalid Authorization header format'
    }
  }

  const expectedToken = config.get('auth.token')
  if (!expectedToken) {
    logBusinessError(logger, {
      operation: OPERATION_NAME,
      error: new Error('Server auth token not configured')
    })
    return {
      isValid: false,
      error: 'Server authentication token not configured'
    }
  }

  const encryptionKey = config.get('auth.encryptionKey')
  if (!encryptionKey) {
    logBusinessError(logger, {
      operation: OPERATION_NAME,
      error: new Error('Server encryption not configured')
    })
    return { isValid: false, error: 'Server encryption not configured' }
  }

  try {
    const encryptedToken = Buffer.from(
      authHeader.split(' ').pop(),
      'base64'
    ).toString('utf-8')
    const actualToken = decryptToken(encryptedToken)
    if (!actualToken) {
      return { isValid: false, error: 'Invalid encrypted token' }
    }

    const tokensMatch = actualToken === expectedToken

    if (!tokensMatch) {
      return { isValid: false, error: 'Invalid bearer token' }
    }
  } catch (error) {
    logBusinessError(logger, {
      operation: OPERATION_NAME,
      error
    })
    return { isValid: false, error: 'Invalid encrypted token' }
  }

  return { isValid: true }
}

const auth = {
  plugin: {
    name: 'auth',
    register: (server) => {
      server.auth.scheme('bearer', () => {
        return {
          authenticate: (request, h) => {
            const authHeader = request.headers.authorization

            const validation = validateAuthToken(authHeader)

            if (!validation.isValid) {
              throw Boom.unauthorized('Invalid authentication credentials')
            }

            return h.authenticated({ credentials: { authenticated: true } })
          }
        }
      })

      server.auth.strategy('bearer', 'bearer')
      server.auth.default('bearer')
    }
  }
}

export { auth, decryptToken, validateAuthToken }
