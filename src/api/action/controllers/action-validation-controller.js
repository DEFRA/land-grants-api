import Boom from '@hapi/boom'
import Joi from 'joi'
import { config } from '~/src/config/index.js'
import { findAction } from '../helpers/find-action.js'
import { actionCombinationLandUseCompatibilityMatrix } from '~/src/api/available-area/helpers/action-land-use-compatibility-matrix.js'
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
 * @returns {Array}
 */
export const isValidCombination = (
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
      if (
        actionCodes.length === combination.length &&
        actionCodes.every((actionCode) => combination.includes(actionCode))
      ) {
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

  return []
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
          landParcel.id = landParcel.id || landParcel.parcelId
          landParcel.sheetId = landParcel.sheetId || landParcel.osSheetId
          const response = await fetch(
            `http://localhost:${config.get('port')}/land/moorland/intersects?landParcelId=${landParcel.id}&sheetId=${landParcel.sheetId}`
          )
          const json = await response.json()
          return ['moorland', json.entity.availableArea]
        }
      })
    )
  )
    .filter((data) => data !== undefined)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
})

/**
 * Executes action rules
 * @param { import('mongodb').Db } db
 * @param { Array } userSelectedActions
 * @param { object } landParcel
 * @returns
 */
const executeActionRules = async (db, userSelectedActions, landParcel) => {
  const actions = await Promise.all(
    userSelectedActions.map(
      async (action) => await findAction(db, action.actionCode)
    )
  )

  return await Promise.all(
    userSelectedActions.map(async (action, index) => {
      const application = {
        areaAppliedFor: parseFloat(action.quantity),
        actionCodeAppliedFor: action.actionCode,
        landParcel: {
          area: parseFloat(landParcel.area),
          existingAgreements: [],
          id: landParcel.id,
          sheetId: landParcel.sheetId
        }
      }
      application.landParcel = await findIntersections(
        landParcel,
        actions[index]
      )

      return {
        action: action.actionCode,
        ...executeRules(application, actions[index].eligibilityRules)
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
   * @param { import('@hapi/hapi').Request & MongoDBPlugin & RequestPayload } request
   * @returns { Promise<*> }
   */
  handler: async ({ db, payload: { actions, landParcel } }, h) => {
    const errors = [
      ...isValidArea(actions, landParcel),
      ...isValidCombination(
        landParcel.agreements,
        actions,
        landParcel.landUseCodes
      )
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
 * @import { MongoDBPlugin } from '~/src/helpers/mongodb.js'
 */
