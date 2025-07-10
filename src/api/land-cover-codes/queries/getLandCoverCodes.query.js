import landCoverCodesModel from '~/src/api/land-cover-codes/models/land-cover-codes.model.js'

/**
 * Get all land cover codes
 * @param {string[]} codes - The codes to get
 * @param {object} logger - The logger
 * @returns {Promise<string[]>} The land cover codes
 */
async function getLandCoverCodesForCodes(codes, logger) {
  try {
    const landCovers = await landCoverCodesModel
      .find({
        $or: [
          { landCoverClassCode: { $in: codes } },
          { landCoverCode: { $in: codes } }
        ]
      })
      .lean()

    logger.info(
      `Land Cover Codes for Codes: ${landCovers?.length || 0} - Codes: ${codes.join(', ')}`
    )
    const landCoverCodes = landCovers.map((code) => code.landCoverCode)
    const uniqueCodes = Array.from(new Set(codes.concat(landCoverCodes)))
    return uniqueCodes.sort()
  } catch (error) {
    logger.error(`Unable to get land cover codes`, error)
    throw error
  }
}

export { getLandCoverCodesForCodes }
