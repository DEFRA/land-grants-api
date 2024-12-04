import Boom from '@hapi/boom'
import { actionLandUseCompatibilityMatrix } from '~/src/api/available-area/helpers/action-land-use-compatibility-matrix.js'
import { findAllActions } from '../helpers/find-all-actions.js'

let actions

const getActionsForLandUses = (landUseCodes) => {
  if (!Array.isArray(landUseCodes)) {
    throw new TypeError('landUseCodes must be an array')
  }

  return actions.filter((action) => {
    const compatibleLandUses =
      actionLandUseCompatibilityMatrix[action.code] || []
    return landUseCodes.some((code) => compatibleLandUses.includes(code))
  })
}

/**
 *
 * @satisfies {Partial<ServerRoute>}
 */
const getAllActionsController = {
  /**
   * @param { import('@hapi/hapi').Request & MongoDBPlugin } request
   * @returns {Promise<*>}
   */
  handler: async (request) => {
    if (!actions) {
      actions = await findAllActions(request.db)
    }

    const parcelId = request.query['parcel-id']
    const landUseCodesString = request.query['land-use-codes']
    const preexistingActions = request.query['preexisting-actions']
      ? request.query['preexisting-actions'].split(',')
      : []
    const landUseCodes = landUseCodesString ? landUseCodesString.split(',') : []

    if (!parcelId) {
      return Boom.badRequest('Missing parcel-id query parameter')
    }

    const filteredActions = getActionsForLandUses(landUseCodes)
      .filter((action) => !preexistingActions.includes(action.code))
      .map((action) => {
        return {
          code: action.code,
          description: action.description,
          payment: action.payment
        }
      })
    return Promise.resolve(filteredActions)
  }
}

export { getAllActionsController }

/**
 * @import { ServerRoute} from '@hapi/hapi'
 * @import { MongoDBPlugin } from '~/src/helpers/mongodb.js'
 */
