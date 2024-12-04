import Boom from '@hapi/boom'
import { findAction } from '../helpers/find-action.js'
import { updateAction } from '../helpers/update-action.js'

/**
 *
 * @satisfies {Partial<ServerRoute>}
 */
const postActionRuleController = {
  /**
   * @param { import('@hapi/hapi').Request & MongoDBPlugin } request
   * @returns {Promise<{message: string}>}
   */
  handler: async (request) => {
    const action = await findAction(request.db, request.params.actionCode)

    if (!action) {
      return Boom.notFound('Action not found')
    }

    if (!request.payload) {
      return Boom.badRequest('New rule not provided')
    }

    action.eligibilityRules.push(request.payload)
    await updateAction(request.db, request.params.actionCode, action)
    return Promise.resolve({ message: 'Rule added successfully' })
  }
}

export { postActionRuleController }

/**
 * @import { ServerRoute} from '@hapi/hapi'
 * @import { MongoDBPlugin} from '~/src/helpers/mongodb.js'
 */
