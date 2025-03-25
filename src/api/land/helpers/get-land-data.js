import Boom from '@hapi/boom'
import landActionsModel from '~/src/api/common/models/land-actions.js'

/**
 * Get land action data for rendering templates
 * @returns {object} The land action data
 * @param {string} parcelId - The parcel ID to fetch
 * @param {object} logger - Logger instance
 */
async function getLandActionData(parcelId, logger) {
  if (!parcelId) {
    throw Boom.badRequest('Parcel ID is required')
  }

  try {
    logger.info(`Fetching land actions data for parcelId ${parcelId}`)

    const landactions = await landActionsModel.findOne({ parcelId }).lean()

    if (!landactions) {
      logger.warn(`Land Parcel not found for parcelId ${parcelId}`)
      throw Boom.notFound('Land Parcel not found')
    }

    logger.info(
      `Successfully retrieved Land Parcel data for parcelId ${parcelId}`
    )
    return landactions
  } catch (error) {
    logger.error(`Error fetching Land Parcel data for parcelId ${parcelId}`, {
      error: error.message,
      stack: error.stack
    })

    if (error.isBoom) {
      throw error
    }

    throw Boom.internal('Failed to fetch Land Parcel data')
  }
}

export { getLandActionData }
