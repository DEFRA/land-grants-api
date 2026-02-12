import { splitParcelId } from '../../service/parcel.service.js'
import { getActionsByLatestVersion } from '../../../actions/queries/2.0.0/getActionsByLatestVersion.query.js'
import { getAndValidateParcels } from '../1.0.0/parcel.validation.js'

/**
 * @import {LandParcelDb} from '~/src/features/parcel/parcel.d.js'
 */

/**
 * Get data and validate request
 * @param {string[]} parcelIds - The parcelIds
 * @param {object} request - The request
 * @param {boolean} validateActions - Whether to validate actions
 * @returns {Promise<{ errors: string[] | null, enabledActions: object[], parcels: object[] }>} The error message
 */
export const getDataAndValidateRequest = async (
  parcelIds,
  request,
  validateActions = true
) => {
  const errors = []

  const parcels = parcelIds.map((parcel) => {
    const { sheetId, parcelId } = splitParcelId(parcel, request.logger)
    return { sheetId, parcelId }
  })

  const response = await getAndValidateParcels(parcels, request)

  let enabledActions = []

  if (validateActions) {
    enabledActions = await getActionsByLatestVersion(
      request.logger,
      request.server.postgresDb
    )

    if (!enabledActions || enabledActions?.length === 0) {
      errors.push('Actions not found')
    }
  }

  if (response?.errors) {
    errors.push(response.errors)
  }
  if (errors.length > 0) {
    return { errors, enabledActions: [], parcels: [] }
  }

  return { errors: null, enabledActions, parcels: response?.parcels }
}
