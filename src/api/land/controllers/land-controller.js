import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import parcelData from '~/src/data/parcel-data.json'

// http://localhost:3001/parcel/SX0679-9999

const transformParcel = (parcel) => {
  return {
    ...parcel,
    actions: parcel.actions.map((a) => ({
      code: a.code,
      description: a.description,
      availableArea: a.availableArea
    }))
  }
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
    const { id } = request.params
    const [sheetId, parcelId] = id.split('-')

    const parcel = parcelData.find(
      (p) => p.parcelId === Number(parcelId) && p.sheetId === sheetId
    )

    if (!parcel) {
      return h
        .response({ message: 'Parcel not found' })
        .code(statusCodes.notFound)
    }

    return h
      .response({ message: 'success', parcel: transformParcel(parcel) })
      .code(statusCodes.ok)
  }
}

export { landController }

/**
 * @import { Request, ResponseToolkit, ServerRoute} from '@hapi/hapi'
 * @import { MongoDBPlugin } from '~/src/api/common/helpers/mongodb.js'
 */
