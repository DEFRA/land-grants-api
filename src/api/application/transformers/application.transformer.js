import { sqmToHaRounded } from '~/src/api/common/helpers/measurement.js'

/**
 * Transform the action result
 * @param {Action} action - The action
 * @param {Action[]} actions - The actions
 * @param {object} availableArea - The available area
 * @param {object} ruleResult - The rule result
 * @returns {object} The action result
 */
export const actionResultTransformer = (
  action,
  actions,
  availableArea,
  ruleResult
) => {
  const actionConfig = actions.find((a) => a.code === action.code)

  return {
    hasPassed: ruleResult.passed,
    code: action.code,
    actionConfigVersion: actionConfig?.actionConfigVersion || '',
    availableArea: {
      explanations: availableArea.explanations,
      areaInHa: sqmToHaRounded(availableArea.availableAreaSqm)
    },
    rules: [ruleResult.results]
  }
}

/**
 * Transform the error messages
 * @param {object[]} parcelResults - The parcel results
 * @returns {string[]} The error messages
 */
export const errorMessagesTransformer = (parcelResults) => {
  return parcelResults.flatMap((parcel) =>
    parcel.actions
      .filter((action) => !action.hasPassed)
      .flatMap((action) =>
        action.rules
          .flat()
          .filter((rule) => !rule.passed)
          .map((rule) => {
            return {
              code: action.code,
              description: rule.reason,
              sheetId: parcel.sheetId,
              parcelId: parcel.parcelId,
              passed: rule.passed
            }
          })
      )
  )
}

/**
 * Transform the application data
 * @param {string} applicationId - The application id
 * @param {string} applicantCrn - The applicant crn
 * @param {string} sbi - The sbi
 * @param {string} requester - The requester
 * @param {object[]} landActions - The land actions
 * @param {object[]} parcelResults - The parcel results
 * @returns {object} The application data
 */
export const applicationDataTransformer = (
  applicationId,
  applicantCrn,
  sbi,
  requester,
  landActions,
  parcelResults
) => {
  const hasPassed = parcelResults.every((r) =>
    r.actions.every((a) => a.hasPassed)
  )

  return {
    date: new Date(),
    applicationId,
    applicantCrn,
    sbi,
    requester,
    landGrantsApiVersion: process.env.SERVICE_VERSION ?? 'unknown',
    hasPassed,
    applicationLevelResults: {},
    application: {
      agreementLevelActions: [],
      parcels: landActions.map((parcel) => ({
        sheetId: parcel.sheetId,
        parcelId: parcel.parcelId,
        actions: parcel.actions
      }))
    },
    parcelLevelResults: parcelResults
  }
}

/**
 * Transform the application data
 * @param {number} areaAppliedFor - The area applied for
 * @param {string} code - The code of the action
 * @param {number} area - The area of the parcel
 * @param {number} intersectingAreaPercentage - The intersecting area percentage
 * @param {Array} existingAgreements - The existing agreements
 * @returns {RuleEngineApplication} - The application
 */
export function ruleEngineApplicationTransformer(
  areaAppliedFor,
  code,
  area,
  intersectingAreaPercentage,
  existingAgreements
) {
  return {
    areaAppliedFor,
    actionCodeAppliedFor: code,
    landParcel: {
      area,
      existingAgreements,
      intersections: {
        moorland: { intersectingAreaPercentage }
      }
    }
  }
}

/**
 * @param {ApplicationValidationRunList[]} applicationValidationRuns
 * @returns {ApplicationValidationRunList[]}
 */
export const applicationValidationRunTransformer = (
  applicationValidationRuns
) => {
  return applicationValidationRuns.map((run) => ({
    id: run.id,
    created_at: run.created_at
  }))
}

/**
 * @import { Action } from '~/src/api/actions/action.d.js'
 * @import { RuleEngineApplication } from '~/src/rules-engine/rules.d.js'
 * @import {ApplicationValidationRunList} from '../application.d.js'
 */
