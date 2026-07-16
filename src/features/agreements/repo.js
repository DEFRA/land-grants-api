import { getAgreementsForParcel as getFromDb } from '~/src/features/agreements/queries/getAgreementsForParcel.query.js'
import { getAgreements as getFromDal } from '~/src/services/dal/index.js'

/**
 * Retrieve agreements for a parcel, from multiple sources
 *
 * N.B. currently agreements are only fetched in order to calculate available
 * area, so we filter the results to those which are area-based (sqm).
 * @param {string} sbi - The SBI for the business owning the parcel
 * @param {string} sheetId - The sheetId
 * @param {string} parcelId - The parcelId
 * @param {string|null} defraIdToken - The user's defra ID token (JWT)
 * @param {any} db - Database connection
 * @param {Logger} logger - Logger object
 * @returns {Promise<AgreementAction[]>} The agreements
 */
export async function getAgreements(
  sbi,
  sheetId,
  parcelId,
  defraIdToken,
  db,
  logger
) {
  const results = await Promise.all([
    getFromDb(sheetId, parcelId, db, logger),
    getFromDal(sbi, parcelId, sheetId, defraIdToken, logger)
  ])

  return results.flat().filter((a) => a.unit === 'sqm')
}

/**
 * @import {AgreementAction} from '~/src/features/agreements/agreements.d.js'
 * @import {Logger} from '~/src/features/common/logger.d.js'
 */
