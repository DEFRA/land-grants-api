import Joi from 'joi'

const agreementLevelItemSchema = Joi.object({
  code: Joi.string().required(),
  description: Joi.string().required(),
  version: Joi.string().required(),
  parcelIds: Joi.array().items(Joi.string()).required(),
  activePaymentTier: Joi.number().integer().required(),
  quantityInActiveTier: Joi.number().required(),
  activeTierRatePence: Joi.number().required(),
  activeTierFlatRatePence: Joi.number().required(),
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
  }),
  result: Joi.object()
})

export const paymentCalculateWMPSchemaV2 = Joi.object({
  parcelIds: Joi.array().items(Joi.string()).min(1).required(),
  oldWoodlandAreaHa: Joi.number().min(0).required(),
  newWoodlandAreaHa: Joi.number().min(0).required(),
  startDate: Joi.date().optional()
})
