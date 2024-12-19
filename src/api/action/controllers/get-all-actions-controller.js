import Boom from '@hapi/boom'

import actionsModel from '~/src/models/actions.js'

let actions

const getActionsForLandUses = (db, landUseCodes) => {
  if (!Array.isArray(landUseCodes)) {
    throw new TypeError('landUseCodes must be an array')
  }

  return actions.filter((action) => {
    const compatibleLandUses = action.uses || []
    return landUseCodes.some((code) => compatibleLandUses.includes(code))
  })
}

/**
 *
 * @satisfies {Partial<ServerRoute>}
 */
const getAllActionsController = {
  /**
   * @param { import('@hapi/hapi').Request } request
   * @returns {Promise<*>}
   */
  handler: async (request) => {
    if (!actions) {
      actions = await actionsModel.find()
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

    const filteredActions = await getActionsForLandUses(
      request.db,
      landUseCodes
    )
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
 */
