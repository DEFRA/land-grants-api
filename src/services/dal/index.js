import { GET_BUSINESS } from './queries.js'
import { config } from '~/src/config/index.js'
import { dalBusinessToAgreements } from '~/src/features/agreements/transformers/agreements.transformer.js'
import { proxyFetch } from '~/src/features/common/helpers/proxy.js'

/**
 * Fetches existing Siti Agri agreements for a business from the DAL
 * @param {string} sbi - Single Business Identifier
 * @returns {Promise<AgreementAction[]>} The existing agreements for the sbi
 */
export async function getAgreements(sbi, parcelId, sheetId, defraIdToken) {
  const endpoint = config.get('dal.apiEndpoint')

  const response = await proxyFetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Gateway-Type': 'external',
      'X-Forwarded-Authorization': defraIdToken
    },
    body: JSON.stringify({ query: GET_BUSINESS, variables: { sbi } })
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch existing DAL agreements for sbi=${sbi}: ${response.status} ${response.statusText}`
    )
  }

  const body = await response.json()
  return dalBusinessToAgreements(body.data.business, parcelId, sheetId)
}

/**
 * @import { AgreementAction } from '~/src/features/agreements/agreements.d.js'
 */
