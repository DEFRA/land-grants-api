import Joi from 'joi'
import { isAreaUnit } from '~/src/features/common/constants/unit_type.js'
import {
  actionSchema,
  parcelIdSchema,
  plannedActionsSchema
} from './parcel.schema.js'

/**
 * The base action must be in the planned actions, which give its area, as an
 * area greater than zero, and so must the base action each planned supplement
 * sits on.
 * @param {{baseActionCode: string, plannedActions: PlannedAction[]}} payload - The request payload
 * @param {Joi.CustomHelpers} helpers - Joi's helpers
 * @returns {object | Joi.ErrorReport} The payload, or why it is invalid
 */
const validateBaseAction = (payload, helpers) => {
  const { baseActionCode, plannedActions } = payload
  const planned = plannedActions.find((p) => p.actionCode === baseActionCode)

  if (!planned) {
    return helpers.message({
      custom: `Base action missing from plannedActions: ${baseActionCode}`
    })
  }

  if (!isAreaUnit(planned.unit) || planned.quantity <= 0) {
    return helpers.message({
      custom: `Base action must be given as an area greater than zero, in ha or sqm: ${baseActionCode}`
    })
  }

  const unplannedBase = plannedActions.find(
    (p) =>
      p.baseActionCode !== undefined &&
      !plannedActions.some((other) => other.actionCode === p.baseActionCode)
  )

  if (unplannedBase) {
    return helpers.message({
      custom: `${unplannedBase.actionCode}'s baseActionCode ${unplannedBase.baseActionCode} is not in plannedActions`
    })
  }

  return payload
}

const parcelSupplementsSchema = Joi.object({
  sbi: Joi.string()
    .required()
    .description(
      'The business, whose existing agreements on the parcel use up land'
    ),
  parcelId: parcelIdSchema.required(),
  baseActionCode: Joi.string()
    .required()
    .description(
      'The selected base action to list the supplements of. It must be in plannedActions, which gives its area.'
    ),
  plannedActions: plannedActionsSchema
    .required()
    .description(
      'Every action selected on the parcel so far: the base actions, the other actions and the supplements selected, each supplement with the base action it sits on (baseActionCode)'
    )
}).custom(validateBaseAction)

// Supplements are reported as the parcels endpoint reports actions, without
// the flag for their own supplements
const supplementSchema = actionSchema.keys({
  hasSupplements: Joi.any().forbidden()
})

const parcelSupplementsSuccessResponseSchema = Joi.object({
  message: Joi.string().valid('success').required(),
  parcelId: Joi.string().required(),
  sheetId: Joi.string().required(),
  baseActionCode: Joi.string().required(),
  supplements: Joi.array().items(supplementSchema).required()
})

export { parcelSupplementsSchema, parcelSupplementsSuccessResponseSchema }

/**
 * @typedef {{actionCode: string, quantity: number, unit: string, baseActionCode?: string}} PlannedAction
 */
