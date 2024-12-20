import Boom from '@hapi/boom'
import isNull from 'lodash/isNull.js'

import codesModel from '../../../models/codes.js'
import { deepSearch } from '../utils/deep-search.js'

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
    const {
      params: { landCoverCode }
    } = request
    const result = await codesModel.findOne({
      $or: [
        { code: landCoverCode.toString() },
        { 'classes.code': landCoverCode.toString() },
        { 'classes.covers.code': landCoverCode.toString() },
        { 'classes.covers.uses.code': landCoverCode.toString() }
      ]
    })

    const landCoverCodeData = deepSearch(result, landCoverCode.toString())

    if (isNull(landCoverCodeData)) {
      return Boom.notFound()
    }

    return h.response(landCoverCodeData).code(200)
  }
}

export { findLandCoverCodeController }

/**
 * @import { ServerRoute} from '@hapi/hapi'
 */
