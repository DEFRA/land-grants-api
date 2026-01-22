import Joi from 'joi'
import {
  explanationsSchema,
  paymentsSchema
} from '../1.0.0/payment-calculate.schema.js'

const parcelItemsSchemaV2 = Joi.object()
  .pattern(
    Joi.number().integer(),
    Joi.object({
      code: Joi.string(),
      description: Joi.string(),
      version: Joi.string(),
      unit: Joi.string(),
      quantity: Joi.number(),
      rateInPence: Joi.number().integer(),
      annualPaymentPence: Joi.number().integer(),
      durationYears: Joi.number().integer(),
      sheetId: Joi.string(),
      parcelId: Joi.string()
    })
  )
  .optional()

export const agreementLevelItemsSchemaV2 = Joi.object()
  .pattern(
    Joi.number().integer(),
    Joi.object({
      code: Joi.string(),
      description: Joi.string(),
      durationYears: Joi.number().integer(),
      version: Joi.string(),
      annualPaymentPence: Joi.number().integer()
    })
  )
  .optional()

const PaymentCalculateResponseSchemaV2 = Joi.object({
  message: Joi.string().required(),
  payment: Joi.object({
    explanations: explanationsSchema,
    agreementStartDate: Joi.string().isoDate().required(),
    agreementEndDate: Joi.string().isoDate().required(),
    frequency: Joi.string()
      .valid('Monthly', 'Quarterly', 'Annually')
      .required(),
    agreementTotalPence: Joi.number().integer().required(),
    annualTotalPence: Joi.number().integer().required(),
    parcelItems: parcelItemsSchemaV2,
    agreementLevelItems: agreementLevelItemsSchemaV2,
    payments: paymentsSchema
  }).required()
})

export { PaymentCalculateResponseSchemaV2 }
