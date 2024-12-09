import Boom from '@hapi/boom'
import Joi from 'joi'
import { findAction } from '../helpers/find-action.js'
import { actionCombinationLandUseCompatibilityMatrix } from '~/src/api/available-area/helpers/action-land-use-compatibility-matrix.js'
import { executeRules } from '~/src/rules-engine/rulesEngine.js'

/**
 * @param { ActionSelection[] } userSelectedActions
 * @param { import('~/src/types.js').LandParcel } landParcel
 */
const isValidArea = (userSelectedActions, landParcel) => {
  const area = parseFloat(landParcel.area)
  for (const action of userSelectedActions) {
    const areaAppliedFor = parseFloat(action.quantity)
    if (areaAppliedFor > area) {
      return [
        `Area applied for (${areaAppliedFor}ha) is greater than parcel area (${area}ha)`
      ]
    }
  }
}

/**
 * @param { import('~/src/types.js').Action[] } preexistingActions
 * @param { ActionSelection[] } userSelectedActions
 * @param { string[] } landUseCodes
 */
const isValidCombination = (
  preexistingActions = [],
  userSelectedActions,
  landUseCodes
) => {
  const actionCodes = userSelectedActions
    .concat(preexistingActions)
    .map((action) => action.actionCode)
  for (const code of landUseCodes) {
    const allowedCombinations =
      actionCombinationLandUseCompatibilityMatrix[code] || []
    let validForThisCode = false
    for (const combination of allowedCombinations) {
      if (actionCodes.every((actionCode) => combination.includes(actionCode))) {
        validForThisCode = true
        break
      }
    }
    if (!validForThisCode) {
      if (preexistingActions.length > 0) {
        const actionCodesString = preexistingActions
          .map((action) => action.actionCode)
          .join(', ')
        return [
          `The selected combination of actions, along with your pre-existing actions (${actionCodesString}), is invalid for land use code ${code}`
        ]
      }
      return [
        `The selected combination of actions are invalid for land use code: ${code}`
      ]
    }
  }
}

/**
 *
 * @param { import('mongodb').Db } db
 * @param { ActionSelection[] } userSelectedActions
 * @param { import('~/src/types.js').LandParcel } landParcel
 * @returns
 */
const executeActionRules = async (db, userSelectedActions, landParcel) => {
  const actionPromises = await Promise.all(
    userSelectedActions.map(
      async (action) => await findAction(db, action.actionCode)
    )
  )

  return userSelectedActions.map((action, index) => {
    const application = {
      areaAppliedFor: parseFloat(action.quantity),
      actionCodeAppliedFor: action.actionCode,
      allActionsAppliedFor: userSelectedActions,
      landParcel: {
        area: parseFloat(landParcel.area),
        moorlandLineStatus: landParcel.moorlandLineStatus,
        existingAgreements: []
      }
    }
    const userSelectedAction = actionPromises[index]

    return {
      action: action.actionCode,
      ...executeRules(application, userSelectedAction.eligibilityRules)
    }
  })
}

/**
 *
 * @satisfies {Partial<ServerRoute>}
 */
const actionValidationController = {
  options: {
    validate: {
      payload: Joi.object({
        actions: Joi.array().required(),
        landParcel: Joi.object().required()
      }).required(),
      failAction: (request, h, error) => {
        return Boom.badRequest(error)
      }
    }
  },

  /**
   * @typedef { object } ActionSelection
   * @property { string } actionCode
   * @property { string } quantity
   */

  /**
   * @typedef { import('@hapi/hapi').Request & object } RequestPayload
   * @property { object } landParcel
   * @property { ActionSelection[] } actions
   */

  /**
   * @param { import('@hapi/hapi').Request & MongoDBPlugin & RequestPayload } request
   * @returns { Promise<*> }
   */
  handler: async ({ db, payload: { actions, landParcel } }, h) => {
    const errors = {
      ...isValidArea(actions, landParcel),
      ...isValidCombination(
        landParcel.agreements,
        actions,
        landParcel.landUseCodes
      )
    }

    if (errors.length) {
      return h
        .response(
          JSON.stringify({
            message: errors,
            isValidCombination: false
          })
        )
        .code(200)
    }

    const ruleResults = await executeActionRules(db, actions, landParcel)
    const ruleFailureMessages = []
    for (const result of ruleResults) {
      if (!result.passed) {
        const results = result.results
          .filter((r) => !r.passed)
          .map((r) => r.message)
          .join(', ')

        ruleFailureMessages.push(`${result.action}: ${results}`)
      }
    }

    if (ruleFailureMessages.length) {
      return h
        .response(
          JSON.stringify({
            message: ruleFailureMessages.join(', '),
            isValidCombination: false
          })
        )
        .code(200)
    }

    return h
      .response(
        JSON.stringify({
          message: 'Action combination valid',
          isValidCombination: true
        })
      )
      .code(200)
  }
}

export { actionValidationController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 * @import { MongoDBPlugin } from '~/src/helpers/mongodb.js'
 */
