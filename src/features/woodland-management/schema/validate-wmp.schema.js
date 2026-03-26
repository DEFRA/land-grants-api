import Joi from 'joi'

export const validateWMPResponseSchemaV2 = Joi.object({
  message: Joi.string().required(),
  result: Joi.object()
})

export const validateWMPSchemaV2 = Joi.object({
  parcelIds: Joi.array().items(Joi.string()).required(),
  oldWoodlandAreaHa: Joi.number().min(0).required(),
  newWoodlandAreaHa: Joi.number().min(0)
})
