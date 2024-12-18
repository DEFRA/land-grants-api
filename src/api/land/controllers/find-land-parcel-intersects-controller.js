import Boom from '@hapi/boom'
import isNull from 'lodash/isNull.js'

import { findLandParcelIntersects } from '~/src/services/arcgis.js'

/**
 *
 * @satisfies {Partial<ServerRoute>}
 */
const findLandParcelIntersectsController = {
  /**
   * @param { import('@hapi/hapi').Request } request
   * @param { import('@hapi/hapi').ResponseToolkit } h
   * @returns {Promise<*>}
   */
  handler: async (request, h) => {
    const entity = await findLandParcelIntersects(
      request.server,
      request.params.landParcelId,
      request.query.sheetId
    )
    if (isNull(entity)) {
      return Boom.notFound()
    }

    return h.response({ message: 'success', entity }).code(200)
  }
}

export { findLandParcelIntersectsController }

/**
 * @import { ServerRoute} from '@hapi/hapi'
 */
