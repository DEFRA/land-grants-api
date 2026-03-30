import Joi from 'joi'

const tierSchema = Joi.object({
  number: Joi.number().integer().required(),
  quantity: Joi.number().required(),
  rateInPence: Joi.number().required(),
  flatRateInPence: Joi.number().required(),
  totalInPence: Joi.number().required()
})

const agreementLevelItemSchema = Joi.object({
  code: Joi.string().required(),
  description: Joi.string().required(),
  version: Joi.string().required(),
  parcelIds: Joi.array().items(Joi.string()).required(),
  tiers: Joi.array().items(tierSchema).required(),
  agreementTotalPence: Joi.number().required(),
  unit: Joi.string().required(),
  quantity: Joi.number().required()
})

const lineItemSchema = Joi.object({
  agreementLevelItemId: Joi.number().integer().required(),
  paymentPence: Joi.number().required()
})

const paymentSchema = Joi.object({
  totalPaymentPence: Joi.number().required(),
  paymentDate: Joi.string().required(),
  lineItems: Joi.array().items(lineItemSchema).required()
})

export const paymentCalculateWMPResponseSchema = Joi.object({
  message: Joi.string().required(),
  payment: Joi.object({
    explanations: Joi.array().required(),
    agreementStartDate: Joi.string().required(),
    agreementEndDate: Joi.string().required(),
    frequency: Joi.string().required(),
    agreementTotalPence: Joi.number().required(),
    parcelItems: Joi.object().required(),
    agreementLevelItems: Joi.object().pattern(
      Joi.number().integer(),
      agreementLevelItemSchema
    ),
    payments: Joi.array().items(paymentSchema).required()
  }).required()
})

export const paymentCalculateWMPSchemaV2 = Joi.object({
  parcelIds: Joi.array().items(Joi.string()).min(1).required(),
  oldWoodlandAreaHa: Joi.number().positive().required(),
  newWoodlandAreaHa: Joi.number().positive().required(),
  startDate: Joi.date().optional()
})
