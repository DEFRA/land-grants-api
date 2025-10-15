import {
  getAvailableAreaDataRequirements,
  getAvailableAreaForAction
} from '~/src/available-area/availableArea.js'
import {
  actionTransformer,
  plannedActionsTransformer
} from '~/src/api/parcel/transformers/parcelActions.transformer.js'

/**
 * @import {LandParcelDb} from '~/src/api/parcel/parcel.d.js'
 * @import {AgreementAction} from '~/src/api/agreements/agreements.d.js'
 * @import {Logger} from '~/src/api/common/logger.d.js'
 * @import {Pool} from '~/src/api/common/postgres.d.js'
 * @import {Action} from '~/src/api/actions/action.d.js'
 */

/**
 * Split id into sheet id and parcel id
 * @param {string} id - 6-character long alpha-numeric string - 4-character long numeric string
 * @returns {object} The sheet id and parcel id
 */
export function splitParcelId(id, logger) {
  try {
    const parts = id?.split('-')
    const sheetId = parts?.[0] || null
    const parcelId = parts?.[1] || null

    if (!sheetId || !parcelId) {
      throw new Error(`Unable to split parcel id ${id}`)
    }

    return {
      sheetId,
      parcelId
    }
  } catch (error) {
    logger.error(`Unable to split parcel id ${id}`, error)
    throw error
  }
}

/**
 * Get parcel actions with available area
 * @param {LandParcelDb} parcel - The parcel
 * @param {AgreementAction[]} actions - The actions to get
 * @param {boolean} showActionResults - Whether to show action results
 * @param {Action[]} enabledActions - The enabled actions
 * @param {Function} compatibilityCheckFn - The compatibility check function
 * @param {Pool} postgresDb - The postgres database
 * @param {Logger} logger - The logger
 * @returns {Promise<any[]>} The parcel actions with available area
 */
export async function getParcelActionsWithAvailableArea(
  parcel,
  actions,
  showActionResults,
  enabledActions,
  compatibilityCheckFn,
  postgresDb,
  logger
) {
  const actionsWithAvailableArea = []

  for (const action of enabledActions.filter((a) => a.display)) {
    const transformedActions = plannedActionsTransformer(actions)

    const aacDataRequirements = await getAvailableAreaDataRequirements(
      action.code,
      parcel.sheet_id,
      parcel.parcel_id,
      transformedActions,
      postgresDb,
      logger
    )

    const availableArea = getAvailableAreaForAction(
      action.code,
      parcel.sheet_id,
      parcel.parcel_id,
      compatibilityCheckFn,
      transformedActions,
      aacDataRequirements,
      logger
    )

    const actionWithAvailableArea = actionTransformer(
      action,
      availableArea,
      showActionResults
    )

    actionsWithAvailableArea.push(actionWithAvailableArea)
  }

  return actionsWithAvailableArea
}
