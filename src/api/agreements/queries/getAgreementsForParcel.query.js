import { startTiming, endTiming } from '~/src/api/common/helpers/performance.js'
import { agreementActionsTransformer } from '../transformers/agreements.transformer.js'

/**
 * @import {AgreementAction} from '~/src/api/agreements/agreements.d.js'
 */

/**
 * Get agreements for a parcel
 * @param {string} sheetId - The sheetId
 * @param {string} parcelId - The parcelId
 * @param {{object}} db connection
 * @param {{object}} logger object
 * @returns {Promise<AgreementAction[]>} The agreements
 */
async function getAgreementsForParcel(sheetId, parcelId, db, logger) {
  let client
  let success = true
  const start = startTiming()

  try {
    logger.info(
      `Connecting to DB to fetch agreements for parcelId: ${sheetId}-${parcelId}`
    )
    client = await db.connect()
    logger.info(`Retrieving agreements for parcelId: ${sheetId}-${parcelId}`)

    const query =
      'SELECT * FROM agreements WHERE sheet_id = $1 and parcel_id = $2'
    const values = [sheetId, parcelId]

    const result = await client.query(query, values)
    logger.info(
      `Retrieved agreements for parcelId:  ${sheetId}-${parcelId}, items: ${result?.rows?.length}`
    )

    return agreementActionsTransformer(result.rows)
  } catch (error) {
    logger.error(`Error executing get agreements query: ${error}`)
    success = false
    return
  } finally {
    if (client) {
      client.release()
    }
    endTiming(logger, 'getAgreementsForParcel', start, success)
  }
}
export { getAgreementsForParcel }
