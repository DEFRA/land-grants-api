import { sqmToHaRounded } from '~/src/api/common/helpers/measurement.js'

export const mapActionResults = (actions) => {
  return actions.reduce((acc, action) => {
    const existingAction = acc.find((a) => a.code === action.code)

    if (existingAction) {
      existingAction.rules.push({
        name: action.rule,
        hasPassed: action.passed,
        reason: action.description,
        explanations: action.explanations || []
      })
      existingAction.hasPassed = existingAction.rules.every((r) => r.hasPassed)
    } else {
      acc.push({
        code: action.code,
        actionConfigVersion: action.actionConfigVersion || '',
        hasPassed: action.passed,
        availableArea: {
          ...action.availableArea.explanations,
          areaInHa: sqmToHaRounded(action.availableArea.areaInHa)
        },
        rules: [
          {
            name: action.rule,
            hasPassed: action.passed,
            reason: action.description,
            explanations: action.explanations || []
          }
        ]
      })
    }
    return acc
  }, [])
}
/**
 *
 * @param {*} application
 * @returns {ApplicationResultData}
 */
export const applicationTransformer = (application) => {
  return {
    date: new Date(),
    requester: application.requester,
    landGrantsApiVersion: process.env.SERVICE_VERSION ?? 'unknown',
    hasPassed: application.hasPassed,
    applicationLevelResults: {},
    application: {
      agreementLevelActions: [],
      parcels: application.landActions.map((parcel) => ({
        sheetId: parcel.sheetId,
        parcelId: parcel.parcelId,
        actions: parcel.actions
      }))
    },
    parcelLevelResults: application.validationResults.map((result) => ({
      sheetId: result.sheetId,
      parcelId: result.parcelId,
      actions: mapActionResults(result.actions)
    }))
  }
}

/**
 * @import { ApplicationResultData } from '../application.d.js'
 */
