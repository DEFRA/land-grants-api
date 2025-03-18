import { statusCodes } from '~/src/api/common/constants/status-codes.js'

const mockData = {
  id: 12345,
  size: {
    unit: 'ha',
    value: 500
  },
  actions: [
    {
      id: 'BND1',
      area: {
        unit: 'ha',
        value: 100
      }
    }
  ]
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
const landController = {
  /**
   * @param { Request & MongoDBPlugin } request
   * @param { ResponseToolkit } h
   * @returns { Promise<*> }
   */
  handler: (request, h) => {
    // const entity = await findExampleData(request.db, request.params.exampleId)
    // if (isNull(entity)) {
    //   return Boom.boomify(Boom.notFound())
    // }

    return h
      .response({ message: 'success', parcel: mockData })
      .code(statusCodes.ok)
  }
}

export { landController }

/**
 * @import { Request, ResponseToolkit, ServerRoute} from '@hapi/hapi'
 * @import { MongoDBPlugin } from '~/src/api/common/helpers/mongodb.js'
 */
