import ActionLandCovers from '~/src/api/land-cover-codes/models/action-land-covers.model.js'

/**
 * Get all land cover codes
 * @param {string} actionCode - The action code to get land cover codes for
 * @param {object} logger - The logger
 * @returns {Promise<{landCoverCode: string, landCoverClassCode: string}[]>} The land cover codes
 */
async function getLandCoversForAction(actionCode, logger) {
  try {
    const actionLandCovers = await ActionLandCovers.find({
      actionCode
    }).lean()

    if (!actionLandCovers || actionLandCovers.length === 0) {
      logger.warn(`No land cover codes found for action code: ${actionCode}`)
      return []
    }

    if (actionLandCovers.length > 1) {
      logger.warn(
        `Multiple land cover codes found for action code: ${actionCode}. Returning the first one.`
      )
    }

    return actionLandCovers[0].landCovers
  } catch (error) {
    logger.error(`Unable to get land cover codes`, error)
    throw error
  }
}

export { getLandCoversForAction }
