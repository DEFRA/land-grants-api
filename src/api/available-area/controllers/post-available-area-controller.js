import { calculateAvailableArea } from './available-area.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
const availableAreaController = {
  /**
   * @param { import('@hapi/hapi').Request } request
   * @returns { ResponseObject }
   */
  handler: (request, h) => {
    if (request.payload == null) {
      return h.response(0.0).code(200)
    }

    const { applicationFor, landParcel, actionCompatibilityMatrix } =
      request.payload

    const area = calculateAvailableArea(
      applicationFor,
      landParcel,
      actionCompatibilityMatrix
    )

    return h.response(area).code(200)
  }
}

export { availableAreaController }

/**
 * @import { ServerRoute, ResponseObject } from '@hapi/hapi'
 */
