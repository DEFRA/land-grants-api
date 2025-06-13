import Joi from 'joi'

const landActionSchema = Joi.object({
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

const landActionValidationResponseSchema = Joi.object({
  message: Joi.string().required(),
  errorMessages: Joi.array().items(
    Joi.object({
      code: Joi.string().required(),
      description: Joi.string().required()
    })
  ),
  valid: Joi.boolean().required()
})

export { landActionSchema, landActionValidationResponseSchema }
