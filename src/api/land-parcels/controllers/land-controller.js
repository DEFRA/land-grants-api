import { statusCodes } from '~/src/api/common/constants/status-codes.js'

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

    const mockData = {
      parcelId: 9238,
      sheetId: 'SX0679',
      size: {
        unit: 'ha',
        value: Math.round(Math.random() * 1000)
      },
      actions: [
        {
          id: 'BND1',
          area: {
            unit: 'ha',
            value: Math.round(Math.random() * 1000)
          }
        }
      ]
    }

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
