import getStsToken from '~/src/services/aws/sts.js'

import { config } from '~/src/config/index.js'

/**
 * Fetch a token from Entra using federated auth
 * @returns {Promise<string>} Entra JWT token for service-to-service auth
 */
export default async function getToken() {
  const entraHost = config.get('azure.entra.host')
  const clientId = config.get('azure.entra.clientId')
  const tenantId = config.get('azure.entra.tenantId')

  const url = `${entraHost}/${tenantId}/oauth2/v2.0/token`

  const stsToken = await getStsToken()

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_assertion: stsToken,
        client_assertion_type:
          'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_id: clientId,
        grant_type: 'client_credentials',
        scope: `${clientId}/.default`
      })
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(
        `Failed to retrieve Entra token: ${res.status} from Azure. Response: ${body}`
      )
    }

    const data = await res.json()
    return data?.access_token
  } catch (err) {
    throw new Error(`Failed to retrieve Entra token from ${url}`, { cause: err })
  }
}
