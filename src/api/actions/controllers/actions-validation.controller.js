import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import { validateLandActions } from '~/src/api/actions/service/land-actions.service.js'

/**
 * LandActionsValidateController
 * Finds all entries in a mongodb collection
 * @satisfies {Partial<ServerRoute>}
 */
const LandActionsValidateController = {
  handler: async (request, h) => {
    try {
      const { landActions } = request.payload
      request.logger.info(`Controller validating land actions ${landActions}`)
      const validationResponse = await validateLandActions(
        landActions,
        request.logger
      )

      return h
        .response({ message: 'success', ...validationResponse })
        .code(statusCodes.ok)
    } catch (error) {
      request.logger.error(`Error validating land actions: ${error.message}`)
      return h
        .response({
          message: error.message
        })
        .code(statusCodes.notFound)
    }
  }
}

export { LandActionsValidateController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */

/*
When a user updates the quantity of land for an action, the UI should check the set of rules for all selected actions.

Just one rule will be in place for all actions - the user may not select an area larger than the total available.

The UI should check the rules when the form is submitted and render the page with errors if there is any problem

A/Cs:

If a user inputs more than the available area then clicks submit, they see an error 

If the user inputs less than or equal to the available area, they are able to submit without error
*/
