import Joi from 'joi'

export const validateWMPResponseSchemaV2 = Joi.object({
  message: Joi.string().required(),
  result: Joi.object()
})

export const validateWMPSchemaV2 = Joi.object({
  parcelIds: Joi.array().items(Joi.string()).required(),
  oldWoodlandArea: Joi.number().positive(),
  newWoodlandArea: Joi.number().positive()
})
