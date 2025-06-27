import actionModel from '~/src/api/actions/models/action.model.js'

/**
 * Get enabled actions
 * @param {object} logger - The logger
 * @returns {Promise<object>} The actions
 */
async function getEnabledActions(logger) {
  try {
    const actions = await actionModel
      .find({
        enabled: true
      })
      .lean()
    return actions
  } catch (error) {
    logger.error(`Unable to get enabled actions`, error)
    throw error
  }
}

export { getEnabledActions }
