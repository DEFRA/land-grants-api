import actionModel from '~/src/api/actions/models/action.model.js'

/**
 * Get all actions
 * @param {object} logger - The logger
 * @returns {object} The actions
 */
async function getActions(logger) {
  try {
    const actions = await actionModel.find({}).lean()
    return actions
  } catch (error) {
    logger.error(`Unable to get actions`, error)
    throw error
  }
}

export { getActions }
