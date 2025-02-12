import fetch from 'node-fetch'
import { URLSearchParams } from 'url'
import { config } from '~/src/config/index.js'

let tokenState = {
  currentToken: null,
  tokenExpiry: null
}

export function isTokenExpired(expiryTime) {
  if (!expiryTime) return true

  const expirationBuffer = 5 * 60 * 1000 // 5 minutes
  return Date.now() >= expiryTime - expirationBuffer
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
  const scope = `api://${clientId}/.default`
  const params = createTokenRequestParams(clientId, scope, clientSecret)

  try {
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
      const errorData = await response.json()
      throw new Error(
        `Token refresh failed: ${errorData.error_description || response.statusText}`
      )
    }

    const data = await response.json()

    tokenState = {
      currentToken: data.access_token,
      // TODO: Check if expires_in comes from response
      tokenExpiry: Date.now() + data.expires_in * 1000 - 5 * 60 * 1000
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
