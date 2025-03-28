import Boom from '@hapi/boom'
import landActionsModel from '~/src/api/common/models/land-actions.js'

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

  try {
    /* eslint-disable no-undef */
    const [sheetId, parcelId] = parcel.split('-')
    /* eslint-disable no-undef */
    logger.info(
      `Fetching land actions data for sheetId: ${sheetId}-parcelId ${parcelId}`
    )

    const landactions = await landActionsModel
      .findOne({ parcelId, sheetId })
      .lean()

    if (!landactions) {
      logger.warn(
        `Land Parcel not found for sheetId: ${sheetId}-parcelId ${parcelId}`
      )
      throw Boom.notFound('Land Parcel not found')
    }

    logger.info(
      `Successfully retrieved Land Parcel data for sheetId: ${sheetId}-parcelId ${parcelId}`
    )
    return landactions
  } catch (error) {
    logger.error(
      `Error fetching Land Parcel data for sheetId: ${sheetId}-parcelId ${parcelId}`,
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
