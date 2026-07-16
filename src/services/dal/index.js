import { GET_BUSINESS } from './queries.js'
import { config } from '~/src/config/index.js'
import { dalBusinessToAgreements } from '~/src/features/agreements/transformers/agreements.transformer.js'
import { logInfo } from '~/src/features/common/helpers/logging/log-helpers.js'
import { proxyFetch } from '~/src/features/common/helpers/proxy.js'

/**
 * Fetches existing Siti Agri agreements for a business from the DAL
 * @param {string} sbi - Single Business Identifier
 * @param {string} parcelId - The parcel ID to filter results by
 * @param {string} sheetId - The sheet ID to filter results by
 * @param {string|null} defraIdToken - The external user token to use for auth (if null, use s2s auth)
 * @param {Logger} logger - Logger object
 * @returns {Promise<AgreementAction[]>} The existing agreements for the sbi
 */
export async function getAgreements(
  sbi,
  parcelId,
  sheetId,
  defraIdToken,
  logger
) {
  // TODO(GSPS-504): In this case we should authenticate differently with the DAL and use service
  // to service auth; this is not yet available so we'll return no results until implemented
  if (defraIdToken === null) {
    return Promise.resolve([])
  }

  if (!config.get('featureFlags.useDal')) {
    return Promise.resolve([])
  }

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
    if (response.status === 404) {
      return Promise.resolve([])
    }

    throw new Error(
      `Failed to fetch existing DAL agreements for sbi=${sbi}: ${response.status} ${response.statusText}`
    )
  }

  const body = await response.json()
  const results = dalBusinessToAgreements(body.data.business, parcelId, sheetId)

  const summary = results.map(
    (a) =>
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `${a.actionCode}: ${a.quantity} ${a.unit}, ${a.startDate}-${a.endDate}`
  )
  logInfo(logger, {
    category: 'agreements',
    operation: 'Fetch agreements from DAL',
    context: { parcelId, sheetId, sbi },
    message: `Retrieved ${results.length} agreements: [${summary.join(', ')}]`
  })

  return results
}

/**
 * @import { AgreementAction } from '~/src/features/agreements/agreements.d.js'
 * @import {Logger} from '~/src/features/common/logger.d.js'
 */
