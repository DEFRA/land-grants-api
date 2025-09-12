export const mapActionResults = (actions) => {
  return actions.reduce((acc, action) => {
    const existingAction = acc.find((a) => a.code === action.code)
    if (existingAction) {
      existingAction.rules.push({
        name: action.rule,
        hasPassed: action.passed,
        reason: action.description
      })
      existingAction.hasPassed = existingAction.rules.every((r) => r.hasPassed)
    } else {
      acc.push({
        code: action.code,
        actionConfigVersion: '', // TODO
        hasPassed: action.passed,
        rules: [
          {
            name: action.rule,
            hasPassed: action.passed,
            reason: action.description
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
    landGrantsApiVersion: '0.0.0', // TODO
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
