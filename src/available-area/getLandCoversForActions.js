import { getLandCoversForAction } from '../api/land-cover-codes/queries/getLandCoversForAction.query.js'

/**
 *
 * @param {Action[]} actions
 * @returns {Promise<{[key: string]: LandCoverCodes[]}>}
 */
export async function getLandCoversForActions(actions, postgresDb, logger) {
  /** @type {{[key: string]: LandCoverCodes[]}} */
  const landCoversForActions = {}
  for (const action of actions) {
    landCoversForActions[action.actionCode] =
      // TODO: Pass array of actions so we process all actions at the same time
      await getLandCoversForAction(action.actionCode, postgresDb, logger)
  }
  return landCoversForActions
}

/**
 * @import { Action } from './available-area.d.js'
 * @import { LandCoverCodes } from '~/src/api/land-cover-codes/land-cover-codes.d.js'
 */
