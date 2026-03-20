import Boom from '@hapi/boom'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/features/common/schema/index.js'
import {
  paymentCalculateWMPSchemaV2,
  paymentCalculateWMPResponseSchemaV2
} from '../../schema/2.0.0/payment-calculate-wmp.controller.js'
import { splitParcelId } from '~/src/features/parcel/service/parcel.service.js'
import { getLandData } from '~/src/features/parcel/queries/getLandData.query.js'
import { logInfo } from '~/src/features/common/helpers/logging/log-helpers.js'

export const PaymentsCalculateWMPControllerV2 = {
  options: {
    tags: ['api'],
    description: 'Calculate WMP payment',
    notes: 'Calculates payment amounts for WMP',
    validate: {
      payload: paymentCalculateWMPSchemaV2,
      failAction: () => {
        throw Boom.badRequest('Invalid request payload input')
      }
    },
    response: {
      status: {
        200: paymentCalculateWMPResponseSchemaV2,
        404: errorResponseSchema,
        500: internalServerErrorResponseSchema
      }
    }
  },

  /**
   * Handler function for payment calculation
   * @param {import('@hapi/hapi').Request} request - Hapi request object
   * @returns {Promise<import('@hapi/hapi').ResponseObject | import('@hapi/boom').Boom>} Payment calculation response
   */
  handler: async (request) => {
    // @ts-expect-error - postgresDb
    const postgresDb = request.server.postgresDb

    /** @type {paymentCalculateWMPSchemaV2} */
    // @ts-expect-error - payload
    const { parcelIds } = request.payload
    const parcels = parcelIds.map((parcelId) =>
      splitParcelId(parcelId, request.logger)
    )

    // get all parcels passed in
    const area = []
    for (const parcel of parcels) {
      const landParcel = await getLandData(
        parcel.sheetId,
        parcel.parcelId,
        postgresDb,
        request.logger
      )

      if (!landParcel) {
        continue
      }

      /** @type {LandParcelDb} */
      area.push(landParcel?.area_sqm)
    }

    // sum those areas
    const totalArea = area.reduce((acc, parcel) => acc + parcel, 0)

    logInfo(request.logger, {
      category: 'payment',
      message: 'Payment calculation',
      context: {
        totalArea
      }
    })

    throw Boom.badRequest('Not implemented')
  }
}

/**
 * @import { LandParcelDb } from '~/src/features/parcel/parcel.d.js'
 */
