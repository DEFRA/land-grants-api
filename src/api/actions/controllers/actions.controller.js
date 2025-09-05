import Boom from '@hapi/boom'
import { statusCodes } from '../../common/constants/status-codes.js'
import { getEnabledActions } from '../queries/getActions.query.js'
import { actionSchema } from '../schema/action.schema.js'

export const ActionsController = {
  options: {
    tags: ['api'],
    description: 'Get all actions',
    notes: 'Returns all actions',
    response: {
      status: {
        200: actionSchema
      }
    }
  },
  handler: async (request, h) => {
    try {
      const actions = await getEnabledActions(
        request.logger,
        request.server.postgresDb
      )
      const displayActions = actions.filter((action) => action.display)
      return h
        .response({ message: 'success', actions: displayActions })
        .code(statusCodes.ok)
    } catch (error) {
      request.logger.error(`Error getting actions: ${error}`)
      return Boom.internalServerError('Error getting actions')
    }
  }
}
