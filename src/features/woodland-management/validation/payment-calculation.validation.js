import { splitParcelId } from '~/src/features/parcel/service/parcel.service.js'
// import { getActionsByLatestVersion } from '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
import { getAndValidateParcels } from '~/src/features/parcel/validation/1.0.0/parcel.validation.js'

/**
 * @import {LandParcelDb} from '~/src/features/parcel/parcel.d.js'
 */

/**
 * Get data and validate request
 * @param {string[]} parcelIds - The parcelIds
 * @param {object} request - The request
 * @returns {Promise<{ errors: string[] | null, parcels: object[] }>} The error message
 */
export const validatePaymentCalculationRequest = async (parcelIds, request) => {
  const errors = []

  const parcels = parcelIds.map((parcel) => {
    const { sheetId, parcelId } = splitParcelId(parcel, request.logger)
    return { sheetId, parcelId }
  })

  const parcelResponse = await getAndValidateParcels(parcels, request)

  if (parcelResponse?.errors) {
    errors.push(parcelResponse.errors)
  }

  if (errors.length > 0) {
    return { errors, parcels: [] }
  }

  return { errors: null, parcels: parcelResponse?.parcels }
}
