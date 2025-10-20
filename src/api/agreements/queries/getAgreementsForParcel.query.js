import {
  logDatabaseError,
  logInfo
} from '~/src/api/common/helpers/logging/log-helpers.js'
import { agreementActionsTransformer } from '../transformers/agreements.transformer.js'

/**
 * @import {AgreementAction} from '~/src/api/agreements/agreements.d.js'
 * @import {Logger} from '~/src/api/common/logger.d.js'
 */

/**
 * Get agreements for a parcel
 * @param {string} sheetId - The sheetId
 * @param {string} parcelId - The parcelId
 * @param {any} db - Database connection
 * @param {Logger} logger - Logger object
 * @returns {Promise<AgreementAction[]>} The agreements
 */
async function getAgreementsForParcel(sheetId, parcelId, db, logger) {
  let client

  try {
    client = await db.connect()

    const query =
      'SELECT * FROM agreements WHERE sheet_id = $1 and parcel_id = $2'
    const values = [sheetId, parcelId]
    const result = await client.query(query, values)
    logInfo(logger, {
      category: 'database',
      message: 'Get agreements for parcel'
    })
    return agreementActionsTransformer(result.rows)
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get agreements for parcel',
      error
    })
    return []
  } finally {
    if (client) {
      client.release()
    }
  }
}
export { getAgreementsForParcel }
