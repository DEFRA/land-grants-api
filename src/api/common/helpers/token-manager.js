import fetch from 'node-fetch'
import { URLSearchParams } from 'url'
import { config } from '~/src/config/index.js'

const EXPIRATION_BUFFER = 5 * 60 * 1000 // refresh tokens 5 minutes before actual expiry

let tokenState = {
  currentToken: null,
  tokenExpiry: null
}

export function isTokenExpired(expiryTime) {
  if (!expiryTime) return true
  return Date.now() >= expiryTime - EXPIRATION_BUFFER
}

export function createTokenRequestParams(clientId, scope, clientSecret) {
  return new URLSearchParams({
    client_id: clientId,
    scope,
    client_secret: clientSecret,
    grant_type: 'client_credentials'
  })
}

export async function refreshToken() {
  const tokenEndpoint = config.get('entra.tokenEndpoint')
  const tenantId = config.get('entra.tenantId')
  const clientId = config.get('entra.clientId')
  const clientSecret = config.get('entra.clientSecret')
  const scope = `${clientId}/.default`

  try {
    const params = createTokenRequestParams(clientId, scope, clientSecret)

    const response = await fetch(
      `${tokenEndpoint}/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed with status ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    tokenState = {
      currentToken: data.access_token,
      tokenExpiry: Date.now() + data.expires_in * 1000
    }

    return tokenState.currentToken
  } catch (error) {
    throw new Error(`Failed to refresh token: ${error.message}`)
  }
}

export async function getValidToken() {
  if (!isTokenExpired(tokenState.tokenExpiry)) {
    return tokenState.currentToken
  }

  return refreshToken()
}
