import Joi from 'joi'
import { HECTARES, SQM } from '~/src/features/common/constants/unit_type.js'
import { actionSchema, parcelIdSchema } from './parcel.schema.js'

// A supplement sits on top of its base action's land, so both are areas
const selectedAreaActionSchema = Joi.object({
  actionCode: Joi.string().required(),
  quantity: Joi.number().positive().required(),
  unit: Joi.string().valid(HECTARES, SQM).required()
})

const parcelSupplementsSchema = Joi.object({
  parcelId: parcelIdSchema.required(),
  baseAction: selectedAreaActionSchema
    .required()
    .description('The selected base action and the area applied for'),
  selectedSupplements: Joi.array()
    .items(selectedAreaActionSchema)
    .default([])
    .description('The supplements of the base action selected so far')
})

// Supplements are reported as the parcels endpoint reports actions, without the flag for their own supplements
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
