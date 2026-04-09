import Joi from 'joi'

export const ruleResultsSchema = Joi.object({
  hasPassed: Joi.boolean().required(),
  code: Joi.string().required(),
  actionConfigVersion: Joi.string().required(),
  rules: Joi.array().items(Joi.object()).required()
})

export const validateWMPResponseSchemaV2 = Joi.object({
  message: Joi.string().required(),
  result: ruleResultsSchema
})

export const validateWMPSchemaV2 = Joi.object({
  parcelIds: Joi.array().items(Joi.string()).required(),
  oldWoodlandAreaHa: Joi.number().min(0).required(),
  newWoodlandAreaHa: Joi.number().min(0)
})
