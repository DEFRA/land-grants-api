import { getLandData } from '~/src/api/parcel/queries/getLandData.query.js'
import { getEnabledActions } from '~/src/api/actions/queries/getActions.query.js'
import { getAgreementsForParcel } from '~/src/api/agreements/queries/getAgreementsForParcel.query.js'
import { plannedActionsTransformer } from '~/src/api/parcel/transformers/parcelActions.transformer.js'
import { createCompatibilityMatrix } from '~/src/available-area/compatibilityMatrix.js'
import { validateLandAction } from '~/src/api/actions/service/action-validation.service.js'

/**
 * Validate the actions for a land parcel
 * @param {{ sheetId: string, parcelId: string, actions: Action[] }} landAction - The land action
 * @param {{ logger: object, server: { postgresDb: object } }} request - The request object
 * @returns {Promise<ValidationResult[]>} The validation result
 */
export const validateLandParcelActions = async (landAction, request) => {
  const landParcels = await getLandData(
    landAction.sheetId,
    landAction.parcelId,
    request.server.postgresDb,
    request.logger
  )

  if (!landParcels || landParcels.length === 0) {
    const errorMessage = `Land parcel not found: ${landAction.sheetId} ${landAction.parcelId}`
    request.logger.error(errorMessage)
    throw new Error(errorMessage)
  }

  const actions = await getEnabledActions(
    request.logger,
    request.server.postgresDb
  )

  if (!actions || actions?.length === 0) {
    const errorMessage = 'Actions not found'
    request.logger.error(errorMessage)
    throw new Error(errorMessage)
  }

  const agreements = await getAgreementsForParcel(
    landAction.sheetId,
    landAction.parcelId,
    request.server.postgresDb,
    request.logger
  )
  const plannedActions = plannedActionsTransformer(agreements)

  const compatibilityCheckFn = await createCompatibilityMatrix(
    request.logger,
    request.server.postgresDb
  )

  let results = []

  for (const action of landAction.actions) {
    const result = await validateLandAction(
      action,
      landParcels[0],
      agreements,
      plannedActions,
      compatibilityCheckFn,
      actions,
      request
    )

    const actionConfig = actions.find((a) => a.code === action.code)

    results = results.concat(
      result.ruleResult.results.map((r) => {
        return {
          code: action.code,
          description: r.reason,
          sheetId: landAction.sheetId,
          parcelId: landAction.parcelId,
          passed: r.passed,
          rule: r.name,
          availableArea: result.availableArea,
          actionConfigVersion: actionConfig?.version ?? '',
          explanations: r.explanations
        }
      })
    )
  }

  return results
}

/**
 * @import { Action } from '../action.d.js'
 * @import { ValidationResult } from '~/src/api/common/common.d.js'
 */
