import Joi from 'joi'

export const paymentCalculateWMPResponseSchemaV2 = Joi.object({
  result: Joi.string().required()
})

export const paymentCalculateWMPSchemaV2 = Joi.object({
  parcelIds: Joi.array().items(Joi.string()).required(),
  areaHectares: Joi.number().positive().required()
})
