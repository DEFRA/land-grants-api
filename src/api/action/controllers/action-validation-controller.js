import Boom from '@hapi/boom'
import Joi from 'joi'

import actionsModel from '~/src/models/actions.js'
import { executeRules } from '~/src/rules-engine/rulesEngine.js'
import { rules } from '~/src/rules-engine/rules/index.js'
import { calculateIntersectionArea } from '~/src/services/arcgis/index.js'

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

  const actionConfigs = await actionsModel.find({
    $or: actionCodes.map((code) => ({
      code
    }))
  })

  for (const actionConfig of actionConfigs) {
    let validForThisCode = false
    if (landUseCodes.every((useCode) => actionConfig.uses.includes(useCode))) {
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
 * @returns { Promise<Record<LayerId, number>> }
 */
const findIntersections = async (
  server,
  landParcelId,
  sheetId,
  actionConfigs
) => {
  const allRequiredIntersectionIds = actionConfigs.flatMap((actionConfig) =>
    actionConfig.eligibilityRules.flatMap(
      (rule) => rules[rule.id].requiredDataLayers
    )
  )

  const allIntersections = await Promise.all(
    allRequiredIntersectionIds.map(async (layerId) => {
      return await calculateIntersectionArea(
        server,
        landParcelId,
        sheetId,
        layerId
      )
    })
  )

  const intersectMap = allIntersections.reduce((acc, intersection) => {
    return {
      ...acc,
      [intersection.layerId]: intersection.intersectingAreaPercentage
    }
  }, {})

  return intersectMap
}

/**
 * Executes action rules
 * @param { import('@hapi/hapi').Server } server
 * @param { Array } userSelectedActions
 * @param { object } landParcel
 * @param { Array } actionConfigs
 * @returns
 */
const executeActionRules = async (
  server,
  userSelectedActions,
  landParcel,
  actionConfigs
) => {
  const allIntersections = await findIntersections(
    server,
    landParcel.id,
    landParcel.sheetId,
    actionConfigs
  )

  return userSelectedActions.map((action, index) => {
    const application = {
      areaAppliedFor: parseFloat(action.quantity),
      actionCodeAppliedFor: action.actionCode,
      landParcel: {
        area: parseFloat(landParcel.area),
        existingAgreements: [],
        id: landParcel.id,
        sheetId: landParcel.sheetId,
        intersections: allIntersections
      }
    }

    return {
      action: action.actionCode,
      ...executeRules(application, actionConfigs[index].eligibilityRules)
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
   * @param { import('@hapi/hapi').Request & RequestPayload } request
   * @returns { Promise<*> }
   */
  handler: async ({ payload: { actions, landParcel }, server }, h) => {
    try {
      const actionApplicationDetails = actions
      const actionCodes = actionApplicationDetails.map(
        (action) => action.actionCode
      )
      const actionConfigs = await actionsModel.find({
        $or: actionCodes.map((code) => ({
          code
        }))
      })

      if (actionConfigs.length !== actionCodes.length) {
        const validActionCodes = actionConfigs.map((action) => action.code)
        const invalidActionCodes = actionCodes.filter(
          (code) => !validActionCodes.includes(code)
        )
        const messages = invalidActionCodes.map(
          (code) => `Invalid action code: ${code}`
        )
        return h
          .response(
            JSON.stringify({
              message: messages,
              isValidCombination: false
            })
          )
          .code(400)
      }

      const errors = [
        ...isValidArea(actionApplicationDetails, landParcel),
        ...(await isValidCombination(
          landParcel.agreements,
          actionApplicationDetails,
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

      const ruleResults = await executeActionRules(
        server,
        actionApplicationDetails,
        landParcel,
        actionConfigs
      )

      const ruleFailureMessages = []
      for (const result of ruleResults) {
        if (!result.passed) {
          const results = result.allResults
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
    } catch (error) {
      return Boom.boomify(error)
    }
  }
}

export { actionValidationController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 * @import {LayerId} from '~/src/rules-engine/rulesEngine.d.js'
 */
