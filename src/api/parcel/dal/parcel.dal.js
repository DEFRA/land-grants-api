import Boom from '@hapi/boom'
import landParcelModel from '~/src/api/parcel/models/parcel.js'

/**
 * Get land action data for rendering templates
 * @returns {object} The land action data
 * @param {string} parcel - The parcel to fetch
 * @param {object} logger - Logger instance
 */
async function getLandActionData(parcel, logger) {
  if (!parcel) {
    throw Boom.badRequest('Parcel is required')
  }

  let sheetId = ''
  let parcelId = ''

  try {
    const parts = parcel.split('-')
    sheetId = parts[0] || ''
    parcelId = parts[1] || ''

    logger.info(`Fetching land actions data for parcel: ${sheetId}-${parcelId}`)

    const landData = await landParcelModel.findOne({ parcelId, sheetId }).lean()
    if (!landData) {
      logger.warn(`Land Parcel not found for parcel: ${sheetId}-${parcelId}`)
      throw Boom.notFound('Land Parcel not found')
    }

    return landData
  } catch (error) {
    logger.error(
      `Error fetching Land Parcel data for parcel: ${sheetId}-${parcelId}`,
      {
        error: error.message,
        stack: error.stack
      }
    )

    if (error.isBoom) {
      throw error
    }

    throw Boom.internal('Failed to fetch Land Parcel data')
  }
}

export { getLandActionData }
