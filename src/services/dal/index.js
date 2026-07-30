import { GET_BUSINESS } from './queries.js';
import { config } from '~/src/config/index.js';
import { dalBusinessToAgreements } from '~/src/features/agreements/transformers/agreements.transformer.js';
import { statusCodes } from '~/src/features/common/constants/status-codes.js';
import { logInfo } from '~/src/features/common/helpers/logging/log-helpers.js';

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
  if (!config.get('featureFlags.useDal')) {
    return [];
  }

  const endpoint = config.get('dal.apiEndpoint');

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
        };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders
    },
    body: JSON.stringify({ query: GET_BUSINESS, variables: { sbi } })
  });

  if (!response.ok) {
    if (response.status === statusCodes.notFound) {
      return [];
    }

    throw new Error(
      `Failed to fetch existing DAL agreements for sbi=${sbi}: ${response.status} ${response.statusText}`
    );
  }

  const body = await response.json();
  const results = dalBusinessToAgreements(
    body.data.business,
    parcelId,
    sheetId
  );

  const summary = results.map(
    (a) =>
      `${a.actionCode}: ${a.quantity} ${a.unit}, ${a.startDate.toISOString().split('T')[0]}-${a.endDate.toISOString().split('T')[0]}`
  );
  logInfo(logger, {
    category: 'agreements',
    operation: 'Fetch agreements from DAL',
    context: { parcelId, sheetId, sbi },
    message: `Retrieved ${results.length} agreements: [${summary.join(', ')}]`
  });

  return results;
}

/**
 * @import { AgreementAction } from '~/src/features/agreements/agreements.d.js'
 * @import {Logger} from '~/src/features/common/logger.d.js'
 */
