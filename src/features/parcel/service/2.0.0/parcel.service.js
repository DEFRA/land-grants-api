import { mergeAgreementsTransformer } from '~/src/features/agreements/transformers/agreements.transformer.js'
import { HECTARES } from '~/src/features/common/constants/unit_type.js'
import { actionsByCompetingUnit } from '~/src/features/common/helpers/action-unit.js'
import { logValidationWarn } from '~/src/features/common/helpers/logging/log-helpers.js'
import { sqmToHaRounded } from '~/src/features/common/helpers/measurement.js'
import { getBoundaryLengthMeters } from '~/src/features/parcel/boundary-length.js'
import { getSidednessForActions } from '~/src/features/parcel/boundary-sidedness.js'
import { EXISTING_ACTIONS_DO_NOT_FIT } from '~/src/features/parcel/constants/unavailable-reasons.js'
import { buildActionWithAvailability } from './action-availability.js'
import {
  areaActionsTransformer,
  lengthActionsTransformer,
  sizeTransformer
} from '../../transformers/parcelActions.transformer.js'
import { runParcelRules } from './parcel-rules.service.js'
import { ruleFailedReason } from './unavailability.js'

/**
 * Get parcel actions with their availability
 * @param {LandParcelDb} parcel - The parcel
 * @param {AgreementAction[]} actions - The actions to get
 * @param {boolean} showActionResults - Whether to show action results
 * @param {PreparedActions} preparedActions - The request's prepared enabled actions
 * @param {Function} compatibilityCheckFn - The compatibility check function
 * @param {Pool} postgresDb - The postgres database
 * @param {Logger} logger - The logger
 * @returns {Promise<any[]>} The parcel actions with their availability
 */
async function getActionsWithAvailability(
  parcel,
  actions,
  showActionResults,
  preparedActions,
  compatibilityCheckFn,
  postgresDb,
  logger
) {
  const { displayedActions, unitByActionCode } = preparedActions

  const boundaryLengthMeters = await getBoundaryLengthMeters(
    parcel,
    displayedActions,
    postgresDb,
    logger
  )

  const { area, length } = actionsByCompetingUnit(actions, unitByActionCode)

  const competingActions = {
    area: areaActionsTransformer(area),
    length: lengthActionsTransformer(length)
  }

  const sidednessByActionCode = await getSidednessForActions(
    boundaryLengthMeters,
    displayedActions,
    competingActions.length,
    postgresDb,
    logger
  )

  // The parcel's land covers and intersections are the same for every action
  const parcelDataCache = new Map()

  // Each action's availability is worked out independently, so run them together
  const actionsWithAvailability = await Promise.all(
    displayedActions.map(async (displayedAction) => {
      const actionWithAvailability = await buildActionWithAvailability(
        displayedAction,
        competingActions,
        {
          showActionResults,
          compatibilityCheckFn,
          boundaryLengthMeters,
          sidednessByActionCode,
          parcel,
          postgresDb,
          logger,
          parcelDataCache
        }
      )

      if (actionWithAvailability.isAvailable) {
        await runRules(
          {
            displayedAction,
            actions,
            displayedActions,
            compatibilityCheckFn,
            parcel,
            actionWithAvailability
          },
          postgresDb,
          logger
        )
      }

      return actionWithAvailability
    })
  )

  const actionsThatDoNotFit = actionsWithAvailability.filter(
    (actionWithAvailability) =>
      actionWithAvailability.unavailableReason?.code ===
      EXISTING_ACTIONS_DO_NOT_FIT
  )

  if (actionsThatDoNotFit.length > 0) {
    logValidationWarn(logger, {
      operation: 'Action availability',
      errors: 'Existing actions do not fit the parcel',
      context: {
        sheetId: parcel.sheet_id,
        parcelId: parcel.parcel_id,
        actionCodes: actionsThatDoNotFit.map((a) => a.code).join(',')
      }
    })
  }

  return actionsWithAvailability
}

async function runRules(
  {
    displayedAction,
    actions,
    displayedActions,
    compatibilityCheckFn,
    parcel,
    actionWithAvailability
  },
  postgresDb,
  logger
) {
  const rulesResult = await runParcelRules(displayedAction, actions, {
    enabledActions: displayedActions,
    compatibilityCheckFn,
    parcel,
    postgresDb,
    logger
  })
  if (!rulesResult.passed) {
    const unavailableReason = ruleFailedReason(rulesResult)
    if (unavailableReason) {
      actionWithAvailability.isAvailable = false
      actionWithAvailability.unavailableReason = ruleFailedReason(rulesResult)
    }
  }
}

export async function getActionsForParcel(
  parcel,
  payload,
  showActionResults,
  preparedActions,
  compatibilityCheckFn,
  request,
  agreements
) {
  const { fields, plannedActions } = payload

  const parcelResponse = {
    parcelId: parcel.parcel_id,
    sheetId: parcel.sheet_id
  }

  if (fields.includes('size')) {
    parcelResponse.size = sizeTransformer(
      sqmToHaRounded(parcel.area_sqm),
      HECTARES
    )
  }

  if (fields.some((f) => f.startsWith('actions'))) {
    const mergedActions = mergeAgreementsTransformer(agreements, plannedActions)

    const actionsWithAvailability = await getActionsWithAvailability(
      parcel,
      mergedActions,
      showActionResults,
      preparedActions,
      compatibilityCheckFn,
      request.server.postgresDb,
      request.logger
    )

    parcelResponse.actions = actionsWithAvailability
  }

  return parcelResponse
}

/**
 * @import {LandParcelDb} from '~/src/features/parcel/parcel.d.js'
 * @import {AgreementAction} from '~/src/features/agreements/agreements.d.js'
 * @import {Logger} from '~/src/features/common/logger.d.js'
 * @import {Pool} from '~/src/features/common/postgres.d.js'
 * @import {PreparedActions} from '~/src/features/parcel/parcel.d.js'
 */
