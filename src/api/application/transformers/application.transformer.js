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
        availableArea: action.availableArea,
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
    landGrantsApiVersion: process.env.npm_package_version ?? 'unknown',
    hasPassed: application.hasPassed,
    application: {
      applicantCrn: application.applicantCrn,
      parcels: application.landActions.map((parcel) => ({
        sheetId: parcel.sheet_id,
        parcelId: parcel.parcel_id,
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
