import { sizeTransformer } from '../parcelActions.transformer.js'

/**
 * Transform parcel and actions to land parcel and actions for v2
 * @param {Action} action - The actions to merge
 * @param {AvailableAreaForAction | null} availableArea - Total Available Area
 * @param {boolean} showResults - Whether to include results
 * @returns {object} The land action data with available area
 */
function actionTransformer(action, availableArea = null, showResults = false) {
  const unit = action.applicationUnitOfMeasurement

  const aa = Number.isFinite(availableArea?.availableAreaHectares)
    ? sizeTransformer(availableArea?.availableAreaHectares ?? 0, unit)
    : undefined

  const availability = { unit, value: null, ...aa, ...action.availability }

  const response = {
    code: action.code,
    description: action.description,
    version: action.semanticVersion,
    // TODO: deprecated in favour of generic availability, rm once grants-ui uses the latter
    availableArea: aa,
    guidanceUrl: action.guidanceUrl ?? undefined,
    availability,
    ...action.payment
  }

  if (showResults) {
    return {
      ...response,
      results: {
        totalValidLandCoverSqm: availableArea?.totalValidLandCoverSqm,
        stacks: availableArea?.stacks,
        explanations: availableArea?.explanations
      }
    }
  }

  return response
}

export { actionTransformer }

/**
 * @import { AvailableAreaForAction } from "~/src/features/available-area/available-area.d.js"
 * @import {Action} from '~/src/features/actions/action.d.js'
 */
