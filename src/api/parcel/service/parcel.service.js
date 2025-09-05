import {
  getAvailableAreaDataRequirements,
  getAvailableAreaForAction
} from '~/src/available-area/availableArea.js'
import {
  actionTransformer,
  plannedActionsTransformer
} from '~/src/api/parcel/transformers/parcelActions.transformer.js'
import { getEnabledActions } from '~/src/api/actions/queries/index.js'
import { createCompatibilityMatrix } from '~/src/available-area/compatibilityMatrix.js'

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
 * @param {string} sheetId - The sheet id
 * @param {string} parcelId - The parcel id
 * @param {object} actions - The actions to get
 * @param {boolean} showActionResults - Whether to show action results
 * @param {object} postgresDb - The postgres database
 * @param {object} logger - The logger
 * @returns {Promise<any[]>} The parcel actions with available area
 */
export async function getParcelActionsWithAvailableArea(
  sheetId,
  parcelId,
  actions,
  showActionResults,
  postgresDb,
  logger
) {
  const enabledActions = await getEnabledActions(logger, postgresDb)
  if (!enabledActions || enabledActions?.length === 0) {
    const errorMessage = 'Actions not found'
    throw Error(errorMessage)
  }

  logger.info(`Found ${enabledActions.length} action configs from DB`)

  const compatibilityCheckFn = await createCompatibilityMatrix(
    logger,
    postgresDb
  )

  const actionsWithAvailableArea = []

  for (const action of enabledActions.filter((a) => a.display)) {
    const transformedActions = plannedActionsTransformer(actions)

    const aacDataRequirements = await getAvailableAreaDataRequirements(
      action.code,
      sheetId,
      parcelId,
      transformedActions,
      postgresDb,
      logger
    )

    const availableArea = getAvailableAreaForAction(
      action.code,
      sheetId,
      parcelId,
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
