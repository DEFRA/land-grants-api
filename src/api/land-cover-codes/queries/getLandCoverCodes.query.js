import landCoverCodesModel from '~/src/api/land-cover-codes/models/land-cover-codes.model.js'

/**
 * Get all land cover codes
 * @param {string[]} codes - The codes to get
 * @param {object} logger - The logger
 * @returns {object} The land cover codes
 */
async function getLandCoverCodesForCodes(codes, logger) {
  try {
    const landCoverCodes = await landCoverCodesModel
      .find({
        $or: [
          { landCoverClassCode: { $in: codes } },
          { landUseClassCode: { $in: codes } }
        ]
      })
      .lean()
    return landCoverCodes
  } catch (error) {
    logger.error(`Unable to get land cover codes`, error)
    throw error
  }
}

export { getLandCoverCodesForCodes }
