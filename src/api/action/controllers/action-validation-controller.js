import Boom from '@hapi/boom'
import Joi from 'joi'
import { findAction } from '../helpers/find-action.js'
import { executeRules } from '~/src/rules-engine/rulesEngine.js'
import { findActions } from '../helpers/find-actions.js'

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

const isValidCombination = async (
  db,
  preexistingActions = [],
  userSelectedActions,
  landUseCodes
) => {
  const actionCodes = userSelectedActions
    .concat(preexistingActions)
    .map((action) => action.actionCode)

  const actions = await findActions(db, actionCodes)

  for (const code of landUseCodes) {
    let validForThisCode = false
    if (actions.every((action) => landUseCodes.includes(action.code))) {
      validForThisCode = true
      break
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
 * @param { Array } userSelectedActions
 * @param { object } landParcel
 * @returns
 */
const executeActionRules = async (db, userSelectedActions, landParcel) => {
  const actionPromises = (
    await Promise.all(
      userSelectedActions.map(
        async (action) => await findAction(db, action.actionCode)
      )
    )
  ).filter((action) => action)

  return userSelectedActions.map((action) => {
    const application = {
      areaAppliedFor: parseFloat(action.quantity),
      actionCodeAppliedFor: action.actionCode,
      landParcel: {
        area: parseFloat(landParcel.area),
        moorlandLineStatus: landParcel.moorlandLineStatus,
        existingAgreements: []
      }
    }

    const userSelectedAction = actionPromises.find(
      (actionPromise) => actionPromise.code === action.actionCode
    )

    if (!userSelectedAction) throw new Error('Unknown action')

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
   * @typedef { import('@hapi/hapi').Request & object } RequestPayload
   * @property { object } landParcel
   * @property { Array } actions
   */

  /**
   * @param { import('@hapi/hapi').Request & MongoDBPlugin & RequestPayload } request
   * @returns { Promise<*> }
   */
  handler: async ({ db, payload: { actions, landParcel } }, h) => {
    const errors = {
      ...isValidArea(actions, landParcel),
      ...(await isValidCombination(
        db,
        landParcel.agreements,
        actions,
        landParcel.landUseCodes
      ))
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

    let ruleResults

    try {
      ruleResults = await executeActionRules(db, actions, landParcel)
    } catch (error) {
      return Boom.badRequest(error)
    }

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
