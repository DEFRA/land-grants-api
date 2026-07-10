import { config } from '~/src/config/index.js'
import { proxyFetch } from '~/src/features/common/helpers/proxy.js'
import { createLogger } from '~/src/features/common/helpers/logging/logger.js'
import { logInfo } from '~/src/features/common/helpers/logging/log-helpers.js'

const logger = createLogger()

/**
 * @typedef {object} agreement
 * @property {string} code - The action/agreement code
 * @property {number} area - The area (ha) covered by the existing agreement
 */

/**
 * Builds the request URL, using either the mock/stub DAL (grants-ui-dal-stub)
 * or the real DAL endpoint, depending on configuration.
 * @returns {string} The base URL to call
 */
function getDalEndpoint() {
  const mockEnabled = config.get('dal.mockEnabled')

  return mockEnabled
    ? config.get('dal.stubApiEndpoint')
    : config.get('dal.apiEndpoint')
}

/**
 * Fetches existing Siti Agri agreements for a business from the DAL
 * (or the mock/stub DAL when enabled).
 * @param {string|number} sbi - Single Business Identifier
 * @returns {Promise<agreement[]>} The existing agreements for the sbi
 */
export async function getExistingDalAgreement(sbi) {
  const endpoint = getDalEndpoint()

  if (!endpoint) {
    logger.warn('DAL endpoint is not configured')
    return []
  }

  const response = await proxyFetch(`${endpoint}/agreements/${sbi}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch existing DAL agreements for sbi=${sbi}: ${response.status} ${response.statusText}`
    )
  }

  const { agreements = [] } = await response.json()

  logInfo(logger, {
    category: 'existing_agreement',
    operation: 'dal_fetch',
    message: 'Fetched existing DAL agreements',
    context: { sbi, count: agreements.length }
  })

  return agreements
}
