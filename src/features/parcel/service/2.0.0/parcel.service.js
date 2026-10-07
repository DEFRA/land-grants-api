import { HECTARES } from '~/src/features/common/constants/unit_type.js'
import {
  areaActionsTransformer,
  lengthActionsTransformer,
  sizeTransformer
} from '~/src/features/parcel/transformers/parcelActions.transformer.js'
import { mergeAgreementsTransformer } from '~/src/features/agreements/transformers/agreements.transformer.js'
import { sqmToHaRounded } from '~/src/features/common/helpers/measurement.js'
import { logValidationWarn } from '~/src/features/common/helpers/logging/log-helpers.js'
import { actionsByCompetingUnit } from '~/src/features/common/helpers/action-unit.js'
import { getBoundaryLengthMeters } from '~/src/features/parcel/boundary-length.js'
import { EXISTING_ACTIONS_DO_NOT_FIT } from '~/src/features/parcel/constants/unavailable-reasons.js'
import { buildActionWithAvailability } from './action-availability.js'

/**
 * @import {LandParcelDb} from '~/src/features/parcel/parcel.d.js'
 * @import {AgreementAction} from '~/src/features/agreements/agreements.d.js'
 * @import {Logger} from '~/src/features/common/logger.d.js'
 * @import {Pool} from '~/src/features/common/postgres.d.js'
 * @import {PreparedActions} from '~/src/features/parcel/parcel.d.js'
 */

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
  const actionsWithAvailability = []

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

  for (const displayedAction of displayedActions) {
    const actionWithAvailability = await buildActionWithAvailability(
      displayedAction,
      competingActions,
      {
        showActionResults,
        compatibilityCheckFn,
        boundaryLengthMeters,
        parcel,
        postgresDb,
        logger
      }
    )

    actionsWithAvailability.push(actionWithAvailability)
  }

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
