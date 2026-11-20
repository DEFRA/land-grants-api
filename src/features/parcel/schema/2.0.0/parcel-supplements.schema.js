import Joi from 'joi'
import {
  actionSchema,
  parcelIdSchema,
  plannedActionsSchema
} from './parcel.schema.js'

const parcelSupplementsSchema = Joi.object({
  sbi: Joi.string()
    .required()
    .description(
      'The business, whose existing agreements on the parcel use up land'
    ),
  parcelId: parcelIdSchema.required(),
  baseAction: Joi.string()
    .required()
    .description(
      'The selected base action to list the supplements of. It must be in plannedActions, which gives its area.'
    ),
  plannedActions: plannedActionsSchema
    .required()
    .description(
      'Every action selected on the parcel so far: the base actions, the other actions and the supplements selected, each supplement with the base action it sits on (baseAction)'
    )
})

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
