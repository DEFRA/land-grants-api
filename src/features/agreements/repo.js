import { getAgreementsForParcels as getFromDb } from '~/src/features/agreements/queries/getAgreementsForParcels.query.js'
import { getAgreements as getFromDal } from '~/src/services/dal/index.js'

/**
 * Retrieve agreements for a parcel, from multiple sources
 *
 * N.B. agreements are returned in every unit; callers filter by the unit they
 * care about, since area and length calculations each need a different subset.
 * Expired agreements are filtered out here.
 * @param {string} sbi - The SBI for the business owning the parcels
 * @param {Array.<[string, string]>} parcels - Parcels for which to fetch agreements, as [parcelId, sheetId]
 * @param {string|null} defraIdToken - The user's defra ID token (JWT)
 * @param {any} db - Database connection
 * @param {Logger} logger - Logger object
 * @returns {Promise<AgreementsByParcel>} The agreements
 */
export async function getAgreements(sbi, parcels, defraIdToken, db, logger) {
  const [dbResults, dalResults] = await Promise.all([
    getFromDb(parcels, db, logger),
    getFromDal(sbi, defraIdToken, logger)
  ])

  const combined = dbResults
  Object.entries(dalResults).forEach(([k, v]) => {
    combined[k] = [...(combined[k] || []), ...v]
  })

  return combined
}

/**
 * @import { AgreementsByParcel } from '~/src/features/agreements/agreements.d.js'
 * @import { Logger } from '~/src/features/common/logger.d.js'
 */
