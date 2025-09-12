import Joi from 'joi'

const applicationValidationSchema = Joi.object({
  applicationId: Joi.string().required(),
  requester: Joi.string().required(),
  applicationCrn: Joi.string().required(),
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

export { applicationValidationSchema }
