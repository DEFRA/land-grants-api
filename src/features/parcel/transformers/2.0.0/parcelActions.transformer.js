import { sizeTransformer } from '../parcelActions.transformer.js'

/**
 * Transform parcel and actions to land parcel and actions for v2
 * @param {Action} action - The actions to merge
 * @param {AvailableAreaForAction | null} availableArea - Total Available Area
 * @returns {object} The land action data with available area
 */
function actionTransformer(action, availableArea = null, showResults = false) {
  const response = {
    code: action.code,
    description: action.description,
    version: action.semanticVersion,
    availableArea: Number.isFinite(availableArea?.availableAreaHectares)
      ? sizeTransformer(availableArea?.availableAreaHectares ?? 0)
      : undefined,
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


export {
  actionTransformer
}

/**
 * @import { AvailableAreaForAction } from "~/src/features/available-area/available-area.d.js"
 */
