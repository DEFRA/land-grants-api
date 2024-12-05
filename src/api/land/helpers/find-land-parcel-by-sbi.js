/**
 * @typedef BusinessParcel
 * @property { string } id
 * @property { string } sheetId
 * @property { object } attributes
 * @property { Array } agreements
 */

/**
 * Finds and returns the latest land parcel from ArcGIS for each specified PARCEL_ID.
 * @param { import('@hapi/hapi').Request & MongoDBPlugin  } request
 * @param { string } sbi
 * @returns {Promise<Array<BusinessParcel>>}
 */
async function findLandParcelsBySbi({ db }, sbi) {
  const results = db.collection('farmers').find({ 'businesses.sbi': sbi })
  const user = await results.toArray()
  const business = user[0].businesses.filter((business) => business.sbi === sbi)

  // Get the parcels
  /** @type { Array<BusinessParcel> } */
  const parcels = business[0].parcels.map((parcel) => ({
    id: parcel.id,
    sheetId: parcel.sheetId,
    agreements: parcel.agreements,
    attributes: parcel.attributes
  }))

  return parcels
}

export { findLandParcelsBySbi }

/** @import { MongoDBPlugin } from '~/src/helpers/mongodb.js' */
