import { AUTH_CONFIG } from './test-config.js'

/**
 * Generates a valid Authorization header with encrypted Bearer token
 * @returns {string} Authorization header value
 */
export function getAuthHeader() {
  const token = AUTH_CONFIG.token
  return `Bearer ${token}`
}
