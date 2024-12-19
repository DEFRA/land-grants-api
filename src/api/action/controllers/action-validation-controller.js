import Boom from '@hapi/boom'
import Joi from 'joi'

import actionsModel from '~/src/models/actions.js'
import { config } from '~/src/config/index.js'
import { executeRules } from '~/src/rules-engine/rulesEngine.js'

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

  return []
}

/**
 * Checks if the supplied actions are a valid combination
 * @param {Array} preexistingActions
 * @param {Array<object>} userSelectedActions
 * @param {Array<string>} landUseCodes
 * @returns {Promise<Array>}
 */
export const isValidCombination = async (
  preexistingActions = [],
  userSelectedActions,
  landUseCodes
) => {
  const actionCodes = userSelectedActions
    .concat(preexistingActions)
    .map((action) => action.actionCode)

  const actions = await actionsModel.find({
    $or: actionCodes.map((code) => ({
      code
    }))
  })

  for (const action of actions) {
    let validForThisCode = false
    if (landUseCodes.every((useCode) => action.uses.includes(useCode))) {
      validForThisCode = true
      break
    }

    if (!validForThisCode) {
      if (preexistingActions.length > 0) {
        const actionCodesString = preexistingActions
          .map((action) => action.actionCode)
          .join(', ')
        return Promise.resolve([
          `The selected combination of actions, along with your pre-existing actions (${actionCodesString}), is invalid for land use code ${landUseCodes.toString()}`
        ])
      }
      return Promise.resolve([
        `The selected combination of actions are invalid for land use code: ${landUseCodes.toString()}`
      ])
    }
  }

  return Promise.resolve([])
}

/**
 * Finds and fetches any intersection data required for applicable eligibility rules
 * @param {*} landParcel
 * @param {*} action
 * @returns { Promise<*> }
 */
const findIntersections = async (landParcel, action) => ({
  ...landParcel,
  intersections: (
    await Promise.all(
      action.eligibilityRules.map(async (rule) => {
        if (rule.id === 'is-below-moorland-line') {
          const response = await fetch(
            `http://localhost:${config.get('port')}/land/intersects/moorland?landParcelId=${landParcel.id}&sheetId=${landParcel.sheetId}`
          )
          const json = await response.json()
          return ['moorland', json.entity.nonIntersectingArea]
        } else if (rule.id === 'is-sssi') {
          const response = await fetch(
            `http://localhost:${config.get('port')}/land/intersects/sssi?landParcelId=${landParcel.id}&sheetId=${landParcel.sheetId}`
          )
          const json = await response.json()
          return ['sssi', json.entity.nonIntersectingArea]
        }
      })
    )
  )
    .filter((data) => data !== undefined)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
})

/**
 * Executes action rules
 * @param { Array } userSelectedActions
 * @param { object } landParcel
 * @returns
 */
const executeActionRules = async (userSelectedActions, landParcel) => {
  const actionPromises = (
    await Promise.all(
      userSelectedActions.map(
        async (action) =>
          await actionsModel.findOne({ code: action.actionCode })
      )
    )
  ).filter((action) => action)

  return await Promise.all(
    userSelectedActions.map(async (action) => {
      const application = {
        areaAppliedFor: parseFloat(action.quantity),
        actionCodeAppliedFor: action.actionCode,
        userSelectedActions,
        landParcel: {
          area: parseFloat(landParcel.area),
          existingAgreements: [],
          id: landParcel.id || landParcel.parcelId,
          sheetId: landParcel.sheetId || landParcel.osSheetId
        }
      }

      const userSelectedAction = actionPromises.find(
        (actionPromise) => actionPromise.code === action.actionCode
      )

      if (!userSelectedAction) throw new Error('Unknown action')

      application.landParcel = await findIntersections(
        application.landParcel,
        userSelectedAction
      )

      return {
        action: action.actionCode,
        ...executeRules(application, userSelectedAction.eligibilityRules)
      }
    })
  )
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
   * @param { import('@hapi/hapi').Request & RequestPayload } request
   * @returns { Promise<*> }
   */
  handler: async ({ payload: { actions, landParcel } }, h) => {
    const errors = [
      ...isValidArea(actions, landParcel),
      ...(await isValidCombination(
        landParcel.agreements,
        actions,
        landParcel.landUseCodes
      ))
    ]

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
      ruleResults = await executeActionRules(actions, landParcel)
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
          message: ['Action combination valid'],
          isValidCombination: true
        })
      )
      .code(200)
  }
}

export { actionValidationController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
