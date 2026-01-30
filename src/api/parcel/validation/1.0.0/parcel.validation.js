import { splitParcelId } from '../../service/parcel.service.js'
import { getEnabledActions } from '../../../actions/queries/getActions.query.js'
import { getLandData } from '../../queries/getLandData.query.js'

/**
 * @import {LandParcelDb} from '~/src/api/parcel/parcel.d.js'
 */

/**
 * Get and validate land parcels request
 * @param {{sheetId: string, parcelId: string}[]} sheetParcelIds - The sheet, parcel ids
 * @param {object} request - The request
 * @returns {Promise<{ errors: string | null, parcels: Array<LandParcelDb | null> }>} The error message
 */
export const getAndValidateParcels = async (sheetParcelIds, request) => {
  const parcels = await Promise.all(
    sheetParcelIds.map(async (sheetParcelId) => {
      const parcel = await getLandData(
        sheetParcelId.sheetId,
        sheetParcelId.parcelId,
        request.server.postgresDb,
        request.logger
      )

      return {
        parcel: parcel?.[0] ?? null,
        sheetId: sheetParcelId.sheetId,
        parcelId: sheetParcelId.parcelId
      }
    })
  )

  const errors = parcels
    .map((p) => {
      return p.parcel ? null : `${p.sheetId}-${p.parcelId}`
    })
    .filter((error) => error !== null)

  return errors && errors.length > 0
    ? { errors: `Land parcels not found: ${errors.join(', ')}`, parcels: [] }
    : { errors: null, parcels: parcels.map((p) => p.parcel) }
}

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
    enabledActions = await getEnabledActions(
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
