import Joi from 'joi'

export const actionConfigInputSchema = Joi.object({
  code: Joi.string().required(),
  semanticVersion: Joi.string().required(),
  displayOrder: Joi.number().optional(),
  startDate: Joi.string().isoDate().optional(),
  applicationUnitOfMeasurement: Joi.string().optional(),
  durationYears: Joi.number().optional(),
  payment: Joi.object().allow(null).optional(),
  paymentMethod: Joi.object().optional(),
  landCoverClassCodes: Joi.array().items(Joi.string()).optional(),
  rules: Joi.array().items(Joi.object()).optional()
}).options({ allowUnknown: true })
