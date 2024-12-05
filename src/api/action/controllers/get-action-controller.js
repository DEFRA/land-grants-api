import Boom from '@hapi/boom'
import { findAction } from '../helpers/find-action.js'

/**
 *
 * @satisfies {Partial<ServerRoute>}
 */
const getActionController = {
  /**
   * @param { import('@hapi/hapi').Request & MongoDBPlugin } request
   * @returns {Promise<*>}
   */
  handler: async ({ db, params: { actionCode } }, h) => {
    if (!actionCode || actionCode === '')
      return Boom.badRequest('Missing actionCode query parameter')

    const action = await findAction(db, actionCode)

    if (!action) return Boom.notFound(`Action ${actionCode} not found`)

    return h.response({ action }).code(200)
  }
}

export { getActionController }

/**
 * @import { ServerRoute} from '@hapi/hapi'
 * @import { MongoDBPlugin } from '~/src/helpers/mongodb.js'
 */
