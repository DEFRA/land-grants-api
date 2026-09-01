import { GetWebIdentityTokenCommand, STSClient } from '@aws-sdk/client-sts'

// One hour in seconds
const TOKEN_DURATION = 3600
const TOKEN_AUDIENCE = 'land_grants_api'

/**
 * Generate an AWS STS Web Identity Token, this can be used to authenticate with Entra via
 * federated auth
 * @returns {Promise<string>} - The token
 */
export default async function getToken() {
  const client = new STSClient()

  const cmd = new GetWebIdentityTokenCommand({
    SigningAlgorithm: 'RS256',
    Audience: [TOKEN_AUDIENCE],
    DurationSeconds: TOKEN_DURATION
  })
  const { WebIdentityToken: token } = await client.send(cmd)

  if (token === undefined) {
    throw new Error('Failed to retrieve JWT token from STS GetWebIdentityToken')
  }
  return token
}
