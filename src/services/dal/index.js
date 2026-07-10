import { config } from '~/src/config/index.js'
import { proxyFetch } from '~/src/features/common/helpers/proxy.js'
import { getAgreementsBySbiQuery } from './queries.js'

/**
 * Fetches existing Siti Agri agreements for a business from the DAL
 * @param {string} sbi - Single Business Identifier
 * @returns {Promise<[]>} The existing agreements for the sbi
 */
export async function getExistingDalAgreements(sbi, { defraIdToken }) {
  const endpoint = config.get('dal.apiEndpoint')

  const response = await proxyFetch(endpoint, {
    method: 'POST',
    headers: {
      'gateway-type': 'external',
      'x-forwarded-authorization': defraIdToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: getAgreementsBySbiQuery,
      variables: { sbi }
    })
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch existing DAL agreements for sbi=${sbi}: ${response.status} ${response.statusText}`
    )
  }

  const { data: { business: { agreements = [] } = {} } = {} } =
    await response.json()

  return agreements
}
