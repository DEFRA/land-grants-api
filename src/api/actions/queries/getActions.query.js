import actionModel from '~/src/api/actions/models/action.model.js'

/**
 * Get all actions
 * @param {object} logger - The logger
 * @param {string[]} codes - The codes to get
 * @returns {object} The actions
 */
async function getActions(logger, codes = ['CMOR1', 'UPL1', 'UPL2', 'UPL3']) {
  try {
    const actions = await actionModel
      .find({
        code: { $in: codes }
      })
      .lean()
    return actions
  } catch (error) {
    logger.error(`Unable to get actions`, error)
    throw error
  }
}

export { getActions }
