import getToken from '~/src/services/entra/index.js'
import { GET_BUSINESS } from './queries.js'
import { config } from '~/src/config/index.js'
import { dalBusinessToAgreements } from '~/src/features/agreements/transformers/agreements.transformer.js'
import { logInfo } from '~/src/features/common/helpers/logging/log-helpers.js'
import { statusCodes } from '~/src/features/common/constants/status-codes.js'

function prettyDate(d) {
  return d.toISOString().split('T')[0]
}

/**
 * Fetches existing Siti Agri agreements for a business from the DAL
 * @param {string} sbi - Single Business Identifier
 * @param {string|null} defraIdToken - The external user token to use for auth (if null, use s2s auth)
 * @param {Logger} logger - Logger object
 * @returns {Promise<AgreementsByParcel>} The existing agreements for the SBI
 */
export async function getAgreements(sbi, defraIdToken, logger) {
  if (!config.get('featureFlags.useDal')) {
    return {}
  }

  const endpoint = config.get('dal.apiEndpoint')

  // Use X-Forwarded-Authorization to pass along the end user's defra ID token if available.
  // For requests without an end user present, we use our "robot" service account auth instead
  /** @type {object} */
  const authHeaders =
    defraIdToken !== null
      ? {
          'Gateway-Type': 'external',
          'X-Forwarded-Authorization': defraIdToken
        }
      : {
          'Gateway-Type': 'internal',
          Email: config.get('dal.serviceAccount')
        }

  let entraHeader = {}

  if (config.get('dal.useEntraAuth')) {
    const entraToken = await getToken()
    entraHeader = { Authorization: `Bearer ${entraToken}` }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...entraHeader
    },
    body: JSON.stringify({ query: GET_BUSINESS, variables: { sbi } })
  })

  if (!response.ok) {
    if (response.status === statusCodes.notFound) {
      return {}
    }

    throw new Error(
      `Failed to fetch existing DAL agreements for sbi=${sbi}: ${response.status} ${response.statusText}`
    )
  }

  const body = await response.json()
  const results = dalBusinessToAgreements(body.data.business)

  const summary = Object.entries(results).flatMap(([parcel, actions]) =>
    actions.map(
      (a) =>
        `${parcel}: ${a.actionCode}: ${a.quantity} ${a.unit}, ${prettyDate(a.startDate)}-${prettyDate(a.endDate)}`
    )
  )
  const resultCount = Object.values(results).flat().length
  logInfo(logger, {
    category: 'agreements',
    operation: 'Fetch agreements from DAL',
    context: { sbi },
    message: `Retrieved ${resultCount} agreements: [${summary.join(', ')}]`
  })

  return results
}

/**
 * @import { AgreementsByParcel } from '~/src/features/agreements/agreements.d.js'
 * @import { Logger } from '~/src/features/common/logger.d.js'
 */
