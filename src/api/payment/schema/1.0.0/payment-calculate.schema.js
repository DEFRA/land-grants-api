import Joi from 'joi'

export const parcelItemsSchema = Joi.object()
  .pattern(
    Joi.number().integer(),
    Joi.object({
      code: Joi.string(),
      description: Joi.string(),
      version: Joi.number(),
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

export const agreementLevelItemsSchema = Joi.object()
  .pattern(
    Joi.number().integer(),
    Joi.object({
      code: Joi.string(),
      description: Joi.string(),
      durationYears: Joi.number().integer(),
      version: Joi.number(),
      annualPaymentPence: Joi.number().integer()
    })
  )
  .optional()

export const paymentsSchema = Joi.array()
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

export const explanationsSchema = Joi.array().items(
  Joi.object({
    title: Joi.string().required(),
    content: Joi.array().items(Joi.string()).required()
  })
)

export const paymentCalculateResponseSchemaV1 = Joi.object({
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
    parcelItems: parcelItemsSchema,
    agreementLevelItems: agreementLevelItemsSchema,
    payments: paymentsSchema
  }).required()
})

export const paymentCalculateSchemaV1 = Joi.object({
  startDate: Joi.date().optional(),
  sbi: Joi.string().optional(),
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
