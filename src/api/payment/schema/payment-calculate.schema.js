import Joi from 'joi'

const PaymentCalculateResponseSchema = Joi.object({
  message: Joi.string().required(),
  payment: Joi.object({
    explanations: Joi.array().items(
      Joi.object({
        title: Joi.string().required(),
        content: Joi.array().items(Joi.string()).required()
      })
    ),
    agreementStartDate: Joi.string().isoDate().required(),
    agreementEndDate: Joi.string().isoDate().required(),
    frequency: Joi.string()
      .valid('Monthly', 'Quarterly', 'Annually')
      .required(),
    agreementTotalPence: Joi.number().integer().required(),
    annualTotalPence: Joi.number().integer().required(),
    parcelItems: Joi.object()
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
          sheetId: Joi.string(),
          parcelId: Joi.string()
        })
      )
      .optional(),
    agreementLevelItems: Joi.object()
      .pattern(
        Joi.number().integer(),
        Joi.object({
          code: Joi.string(),
          description: Joi.string(),
          version: Joi.number(),
          annualPaymentPence: Joi.number().integer()
        })
      )
      .optional(),
    payments: Joi.array()
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
  }).required()
})

const paymentCalculateSchema = Joi.object({
  startDate: Joi.string().optional(),
  landActions: Joi.array()
    .items(
      Joi.object({
        sheetId: Joi.string().required(),
        parcelId: Joi.string().required(),
        sbi: Joi.number().integer().required(),
        actions: Joi.array()
          .items(
            Joi.object({
              code: Joi.string().required(),
              quantity: Joi.number().required()
            })
          )
          .required()
      })
    )
    .required()
})

export { PaymentCalculateResponseSchema, paymentCalculateSchema }
