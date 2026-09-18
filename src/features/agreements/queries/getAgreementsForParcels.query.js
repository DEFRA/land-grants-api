import { dbToAgreements } from '../transformers/agreements.transformer.js'
import {
  logDatabaseError,
  logInfo
} from '~/src/features/common/helpers/logging/log-helpers.js'

/**
 * @import {AgreementAction, AgreementsByParcel} from '~/src/features/agreements/agreements.d.js'
 * @import {Logger} from '~/src/features/common/logger.d.js'
 */

/**
 * Get agreements for a parcel
 * @param {Array.<[string, string]>} parcels - Parcels for which to fetch agreements, as [parcelId, sheetId]
 * @param {any} db - Database connection
 * @param {Logger} logger - Logger object
 * @returns {Promise<AgreementsByParcel>} The agreements
 */
export async function getAgreementsForParcels(parcels, db, logger) {
  let client

  try {
    client = await db.connect()

    // Unfortunately types get complicated with the input being arrays so a standard approach like
    // (parcel_id, sheet_id) = ANY($1) doesn't work, we have to do some UNNESTing and then join
    const query = `
      WITH input AS (SELECT UNNEST($1::TEXT[]) parcel_id, UNNEST($2::TEXT[]) sheet_id)
      SELECT a.* FROM input
      LEFT JOIN agreements a
        ON a.parcel_id = input.parcel_id AND a.sheet_id = input.sheet_id
      WHERE a.parcel_id IS NOT NULL AND a.sheet_id IS NOT NULL
    `
    const parcelIds = parcels.map((p) => p[0])
    const sheetIds = parcels.map((p) => p[1])
    const result = await client.query(query, [parcelIds, sheetIds])

    const prettyParcels = parcels.map((p) => p.join('-')).join(', ')

    logInfo(logger, {
      category: 'database',
      operation: 'Fetch agreements from postgres',
      message: `Fetching agreements from postgres for parcels: [${prettyParcels}]`
    })

    return dbToAgreements(result.rows)
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get agreements for parcel',
      error
    })
    return {}
  } finally {
    if (client) {
      client.release()
    }
  }
}
