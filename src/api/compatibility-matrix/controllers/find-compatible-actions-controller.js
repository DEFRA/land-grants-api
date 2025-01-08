import optionsData from '~/src/models/options-data.js'
import { initCache } from '~/src/helpers/cache.js'

let cache

/**
 * Example controller
 * Finds all entries in a mongodb collection
 * @satisfies {Partial<ServerRoute>}
 */
const findCompatibleActions = {
  /**
   * @param { import('@hapi/hapi').Request & MongoDBPlugin } request
   * @param { import('@hapi/hapi').ResponseToolkit } h
   * @returns {Promise<*>}
   */
  handler: async (request, h) => {
    if (!cache) {
      cache = initCache(
        request.server,
        'compatibleActions',
        async ({ action }) => await optionsData.find({ option_code: action })
      )
    }

    const entities = await cache.get({
      id: request.params.action,
      action: request.params.action
    })
    return h.response({ message: 'success', entities }).code(200)
  }
}

export { findCompatibleActions }

/**
 * @import { ServerRoute} from '@hapi/hapi'
 * @import { MongoDBPlugin } from '~/src/helpers/mongodb.js'
 */
