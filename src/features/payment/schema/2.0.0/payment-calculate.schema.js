import Joi from 'joi'

export const PaymentsSchema = Joi.array()
  .items(
    Joi.object({
      totalPaymentPence: Joi.number().integer().min(0),
      paymentDate: Joi.string(),
      lineItems: Joi.array().items(
        Joi.object({
          parcelItemId: Joi.number().integer().optional(),
          agreementLevelItemId: Joi.number().integer().optional(),
          paymentPence: Joi.number().integer()
        })
      )
    })
  )
  .min(1)
  .required()

export const ExplanationsSchema = Joi.array().items(
  Joi.object({
    title: Joi.string().required(),
    content: Joi.array().items(Joi.string()).required()
  })
)

const PaymentCalculateSchema = Joi.object({
  startDate: Joi.date().optional(),
  sbi: Joi.string().optional(),
  applicationId: Joi.string().optional(),
  parcel: Joi.array()
    .items(
      Joi.object({
        sheetId: Joi.string().required(),
        parcelId: Joi.string().required(),
        actions: Joi.array()
          .items(
            Joi.object({
              code: Joi.string().required(),
              quantity: Joi.number().positive().required()
            })
          )
          .required()
      })
    )
    .required()
})

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
    explanations: ExplanationsSchema,
    agreementStartDate: Joi.string().isoDate().required(),
    agreementEndDate: Joi.string().isoDate().required(),
    frequency: Joi.string()
      .valid('Monthly', 'Quarterly', 'Annually')
      .required(),
    agreementTotalPence: Joi.number().integer().required(),
    annualTotalPence: Joi.number().integer().required(),
    parcelItems: parcelItemsSchemaV2,
    agreementLevelItems: agreementLevelItemsSchemaV2,
    payments: PaymentsSchema
  }).required()
})

export { PaymentCalculateSchema, PaymentCalculateResponseSchemaV2 }
