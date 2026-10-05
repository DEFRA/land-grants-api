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
 * One parcel's agreement actions. AgreementsByParcel is keyed parcel-then-sheet,
 * the inverse of how the composite key is usually written, so use this rather
 * than building the key at the call site. The parcel is named rather than
 * positional for the same reason: a missed key returns nothing, it does not fail.
 * @param {AgreementsByParcel} agreements - Agreements keyed by parcelId-sheetId
 * @param {{parcelId: string, sheetId: string}} parcel - The parcel to look up
 * @returns {AgreementAction[]} The parcel's agreement actions, or an empty array
 */
export function agreementsForParcel(agreements, { parcelId, sheetId }) {
  return agreements[`${parcelId}-${sheetId}`] ?? []
}

/**
 * @import { AgreementsByParcel, AgreementAction } from '~/src/features/agreements/agreements.d.js'
 * @import { Logger } from '~/src/features/common/logger.d.js'
 */
