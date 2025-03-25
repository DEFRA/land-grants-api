import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import { findAllExampleData } from '~/src/api/land/helpers/find-all-example-data.js'

/**
 * Example controller
 * Finds all entries in a mongodb collection
 * @satisfies {Partial<ServerRoute>}
 */
const exampleFindAllController = {
  handler: async (request, h) => {
    const entities = await findAllExampleData(request.db)

    return h.response({ message: 'success', entities }).code(statusCodes.ok)
  }
}

export { exampleFindAllController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
