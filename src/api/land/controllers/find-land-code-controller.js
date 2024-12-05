import Boom from '@hapi/boom'
import isNull from 'lodash/isNull.js'

import { findLandCoverCode } from '../helpers/find-land-cover-code.js'

/**
 *
 * @satisfies {Partial<ServerRoute>}
 */
const findLandCoverCodeController = {
  /**
   * @param { import('@hapi/hapi').Request & MongoDBPlugin } request
   * @param { import('@hapi/hapi').ResponseToolkit } h
   * @returns {Promise<*>}
   */
  handler: async (request, h) => {
    const entity = await findLandCoverCode(
      request.db,
      request.params.landCoverCode
    )

    if (isNull(entity)) {
      return Boom.notFound()
    }

    return h.response(entity).code(200)
  }
}

export { findLandCoverCodeController }

/**
 * @import { ServerRoute} from '@hapi/hapi'
 * @import { MongoDBPlugin } from '~/src/helpers/mongodb.js'
 */
