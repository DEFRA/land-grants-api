import Boom from '@hapi/boom'

import actionsModel from '~/src/models/actions.js'

/**
 *
 * @satisfies {Partial<ServerRoute>}
 */
const getActionController = {
  /**
   * @param { import('@hapi/hapi').Request } request
   * @returns {Promise<*>}
   */
  handler: async ({ params: { actionCode } }, h) => {
    if (!actionCode || actionCode === '')
      return Boom.badRequest('Missing actionCode query parameter')

    const action = await actionsModel.findOne({ code: actionCode })

    if (!action) return Boom.notFound(`Action ${actionCode} not found`)

    return h.response({ action }).code(200)
  }
}

export { getActionController }

/**
 * @import { ServerRoute} from '@hapi/hapi'
 */
