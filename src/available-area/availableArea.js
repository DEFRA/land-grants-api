import { sqmToHaRounded } from '~/src/api/common/helpers/measurement.js'
import {
  getLandCoversForAction,
  getLandCoversForActions
} from '../api/land-cover-codes/queries/getLandCoversForActions.query.js'
import { mergeLandCoverCodes } from '../api/land-cover-codes/services/merge-land-cover-codes.js'
import { getLandCoversForParcel } from '../api/parcel/queries/getLandCoversForParcel.query.js'
import { calculateTotalValidLandCoverArea } from './calculateTotalValidLandCoverArea.js'
import { filterActionsWithCommonLandCover } from './filterActionsWithCommonLandCover.js'
import { stackActions } from './stackActions.js'
import { subtractIncompatibleStacks } from './subtractIncompatibleStacks.js'
import { subtractIncompatibleLandCoverAreaFromActions } from './subtractIncompatibleLandCoverAreaFromActions.js'
import { getLandCoverDefinitions } from '../api/land-cover-codes/queries/getLandCoverDefinitions.query.js'

/**
 * Fetches the land cover codes for the action being applied for, the land covers for the parcel,
 * and the land covers for existing actions.
 * @param {string} actionCodeAppliedFor - The action code being applied for
 * @param {string} sheetId - The sheet ID of the parcel
 * @param {string} parcelId - The parcel ID
 * @param {Action[]} existingActions - The list of existing actions
 * @param {object} postgresDb - The Postgres database connection
 * @param {object} logger - The logger object
 * @returns {Promise<AvailableAreaDataRequirements>} - An object containing land cover codes for the action, land covers for the parcel, and land covers for existing actions
 */
export async function getAvailableAreaDataRequirements(
  actionCodeAppliedFor,
  sheetId,
  parcelId,
  existingActions,
  postgresDb,
  logger
) {
  const landCoverCodesForAppliedForAction = await getLandCoversForAction(
    actionCodeAppliedFor,
    postgresDb,
    logger
  )

  logger.info(
    `Found ${landCoverCodesForAppliedForAction.length} landCoverCodesForAppliedForAction for action: ${actionCodeAppliedFor} for parcel: ${sheetId}-${parcelId}: ${JSON.stringify(
      landCoverCodesForAppliedForAction
    )}`
  )

  const landCoversForParcel = await getLandCoversForParcel(
    sheetId,
    parcelId,
    postgresDb,
    logger
  )

  const landCoversForExistingActions = await getLandCoversForActions(
    existingActions.map((a) => a.actionCode),
    postgresDb,
    logger
  )

  const landCoverCodesForExistingActions = Object.keys(
    landCoversForExistingActions
  ).flatMap((k) => landCoversForExistingActions[k].map((c) => c.landCoverCode))

  const allLandCoverCodes = new Set([
    ...landCoverCodesForAppliedForAction.map((c) => c.landCoverCode),
    ...landCoversForParcel.map((c) => c.landCoverClassCode),
    ...landCoverCodesForExistingActions
  ])

  logger.info('All land cover codes:', allLandCoverCodes)

  const landCoverDefinitions = await getLandCoverDefinitions(
    Array.from(allLandCoverCodes),
    postgresDb,
    logger
  )

  return {
    landCoverCodesForAppliedForAction,
    landCoversForParcel,
    landCoversForExistingActions,
    landCoverDefinitions
  }
}

/**
 *
 * @param {string} actionCodeAppliedFor
 * @param {string} sheetId
 * @param {string} parcelId
 * @param {CompatibilityCheckFn} compatibilityCheckFn
 * @param {Action[]} existingActions
 * @param {AvailableAreaDataRequirements} availableAreaDataRequirements
 * @param {object} logger
 * @returns
 */
export function getAvailableAreaForAction(
  actionCodeAppliedFor,
  sheetId,
  parcelId,
  compatibilityCheckFn,
  existingActions,
  availableAreaDataRequirements,
  logger
) {
  logger.info(
    `Getting available area for action: ${actionCodeAppliedFor} for parcel: ${sheetId}-${parcelId}`
  )

  const {
    landCoverCodesForAppliedForAction,
    landCoversForParcel,
    landCoversForExistingActions,
    landCoverDefinitions
  } = availableAreaDataRequirements

  const explanations = getInitialExplanations(
    actionCodeAppliedFor,
    sheetId,
    parcelId,
    landCoversForParcel,
    existingActions,
    landCoverCodesForAppliedForAction,
    landCoverDefinitions
  )

  const mergedLandCoverCodesForAppliedForAction = mergeLandCoverCodes(
    landCoverCodesForAppliedForAction
  )
  const totalValidLandCoverSqm = calculateTotalValidLandCoverArea(
    landCoversForParcel,
    mergedLandCoverCodesForAppliedForAction
  )

  logger.info(
    `totalValidLandCoverSqm ${totalValidLandCoverSqm} for action: ${actionCodeAppliedFor} for parcel: ${sheetId}-${parcelId}`
  )

  const existingActionsWithLandCoverInCommonWithAppliedForAction =
    filterActionsWithCommonLandCover(
      existingActions || [],
      landCoversForExistingActions,
      mergedLandCoverCodesForAppliedForAction,
      logger
    )

  logger.info(
    `existingActionsWithLandCoverInCommonWithAppliedForAction ${JSON.stringify(existingActionsWithLandCoverInCommonWithAppliedForAction)}`
  )

  const revisedActions = subtractIncompatibleLandCoverAreaFromActions(
    existingActionsWithLandCoverInCommonWithAppliedForAction,
    landCoversForParcel,
    landCoversForExistingActions,
    mergedLandCoverCodesForAppliedForAction,
    logger
  )

  const stackResponse = stackActions(revisedActions, compatibilityCheckFn)

  explanations.push(stackResponse.explanations)

  // subtract areas of stacks where any action is not compatible
  const availableAreaSqm = subtractIncompatibleStacks(
    actionCodeAppliedFor,
    totalValidLandCoverSqm,
    stackResponse.stacks,
    compatibilityCheckFn
  )

  const availableAreaHectares = sqmToHaRounded(availableAreaSqm)

  logger.info(
    `availableArea ${availableAreaHectares} for action: ${actionCodeAppliedFor} for parcel: ${sheetId}-${parcelId}`
  )

  return {
    stacks: stackResponse.stacks,
    explanations,
    availableAreaSqm,
    totalValidLandCoverSqm,
    availableAreaHectares
  }
}

/**
 * Generates the initial explanations for the available area calculation.
 * @param {string} actionCodeAppliedFor - The action code being applied for
 * @param {string} sheetId - The sheet ID of the parcel
 * @param {string} parcelId - The parcel ID
 * @param {LandCover[]} landCoversForParcel - The land covers for the parcel
 * @param {Action[]} existingActions - The list of existing actions
 * @param {LandCoverCodes[]} landCoverCodesForAppliedForAction - The land cover codes for the action being applied for
 * @param {{[key:string]: LandCoverDefinition}} landCoverDefinitions - The land cover definitions
 * @returns {ExplanationSection[]} - An array of explanation sections
 */
function getInitialExplanations(
  actionCodeAppliedFor,
  sheetId,
  parcelId,
  landCoversForParcel,
  existingActions,
  landCoverCodesForAppliedForAction,
  landCoverDefinitions
) {
  console.log('land cover definitions', landCoverDefinitions)
  return [
    {
      title: 'Application Information',
      content: [
        `Action code - ${actionCodeAppliedFor}`,
        `Parcel Id - ${sheetId} ${parcelId}`
      ]
    },
    {
      title: 'Land Covers For Parcel',
      content: landCoversForParcel.map((cover) => {
        const landCoverDefinition =
          landCoverDefinitions[cover.landCoverClassCode]

        if (landCoverDefinition != null) {
          return `${landCoverDefinition.landCoverDescription} (${cover.landCoverClassCode}) - ${sqmToHaRounded(cover.areaSqm)} ha`
        }
        return `${cover.landCoverClassCode} - ${sqmToHaRounded(cover.areaSqm)} ha`
      })
    },
    {
      title: 'Existing actions',
      content: existingActions.map(
        (action) =>
          `${action.actionCode} - ${sqmToHaRounded(action.areaSqm)} ha`
      )
    },
    {
      title: `Valid land covers for action: ${actionCodeAppliedFor}`,
      content: landCoverCodesForAppliedForAction.map((code) => {
        const landCoverDefinition = landCoverDefinitions[code.landCoverCode]

        if (!landCoverDefinition) {
          return `${code.landCoverClassCode} - ${code.landCoverCode}`
        }

        return `${landCoverDefinition.landCoverClassDescription} (${code.landCoverClassCode}) - ${landCoverDefinition.landCoverDescription} (${code.landCoverCode})`
      })
    }
  ]
}

/**
 * @import { Action, CompatibilityCheckFn, AvailableAreaDataRequirements, ExplanationSection} from './available-area.d.js'
 * @import { LandCover } from '../api/parcel/parcel.d.js'
 * @import { LandCoverCodes, LandCoverDefinition } from '../api/land-cover-codes/land-cover-codes.d.js'
 */
