import Joi from 'joi'

export const paymentCalculateWMPResponseSchemaV2 = Joi.object({
  message: Joi.string().required(),
  result: Joi.object()
})

export const paymentCalculateWMPSchemaV2 = Joi.object({
  parcelIds: Joi.array().items(Joi.string()).required(),
  oldWoodlandAreaHa: Joi.number().positive().required(),
  newWoodlandAreaHa: Joi.number().positive().required(),
  startDate: Joi.date().optional()
})
