import { sqmToHaRounded } from '~/src/features/common/helpers/measurement.js'
import { formatLengthExplanationSections } from '~/src/features/available-length/explanations.js'

/**
 * @import { ActionRequest, ApplicationValidationRun } from '~/src/features/application/application.d.js'
 * @import { TargetedAvailableLength } from '~/src/features/available-length/available-length.d.js'
 * @import { Action } from '~/src/features/actions/action.d.js'
 * @import {ApplicationValidationRunList} from '~/src/features/application/application.d.js'
 * @import { RulesResult } from '~/src/features/rules-engine/rules.d.js'
 */

/**
 * Transform the action result
 * @param {object} actionResult
 * @param {ActionRequest} actionResult.action - The action
 * @param {Action[]} actionResult.actions - The actions
 * @param {object|null} [actionResult.availableArea] - The available area, for an area action
 * @param {TargetedAvailableLength} [actionResult.availableLength] - The available length, for a linear action
 * @param {RulesResult} actionResult.ruleResult - The rule result
 * @returns {object} The validation result
 */
export const actionResultTransformer = ({
  action,
  actions,
  availableArea,
  availableLength,
  ruleResult
}) => {
  const actionConfig = actions.find((a) => a.code === action.code)

  const availableAreaResult = availableArea
    ? {
        explanations: availableArea.explanations,
        areaInHa: sqmToHaRounded(availableArea.availableAreaSqm)
      }
    : null

  const availableLengthResult = availableLength
    ? {
        lengthMeters: availableLength.availableLength,
        explanations: formatLengthExplanationSections(availableLength, {
          targetAction: action.code,
          targetSidedness: availableLength.targetSidedness
        })
      }
    : null

  return {
    hasPassed: ruleResult.passed,
    code: action.code,
    actionConfigVersion: actionConfig?.semanticVersion,
    availableArea: availableAreaResult,
    availableLength: availableLengthResult,
    rules: ruleResult.results
  }
}

/**
 * map rules for application validation v2
 * @param {*} rule - The rule
 * @returns
 */
const mapRules = (rule) => {
  return {
    name: rule.name,
    passed: rule.passed,
    ...(rule?.reason && { reason: rule?.reason }),
    ...(rule?.description && { description: rule?.description }),
    ...(rule?.explanations && { explanations: rule?.explanations }),
    ...(rule?.caveat && { caveat: rule?.caveat })
  }
}

/**
 * Transform the action validation results for V2
 * @param {object[]} parcelResults - The parcel results
 * @returns {string[]} The error messages
 */
export const actionValidationResultsTransformer = (parcelResults) => {
  return parcelResults.flatMap((parcel) =>
    parcel.actions.flatMap((action) => {
      return {
        actionCode: action.code,
        sheetId: parcel.sheetId,
        parcelId: parcel.parcelId,
        hasPassed: action.rules.every((rule) => rule.passed),
        rules: action.rules?.map(mapRules) ?? [],
        version: action.actionConfigVersion
      }
    })
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
 * @returns {ApplicationValidationRun} The application data
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
    sbi: sbi?.toString(),
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
