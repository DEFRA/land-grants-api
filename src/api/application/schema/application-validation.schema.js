import Joi from 'joi'

const applicationValidationSchema = Joi.object({
  applicationId: Joi.string().required(),
  requester: Joi.string().required(),
  applicantCrn: Joi.string().required(),
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

const applicationValidationRunSchema = Joi.object({
  id: Joi.number().integer().required(),
  application_id: Joi.string().required(),
  sbi: Joi.string().required(),
  crn: Joi.string().required(),
  data: Joi.object().required(),
  created_at: Joi.date().required()
})

const applicationValidationRunRequestSchema = Joi.object({
  id: Joi.number().integer().required()
})

const applicationValidationRunResponseSchema = Joi.object({
  message: Joi.string().required(),
  applicationValidationRun: applicationValidationRunSchema
})

export {
  applicationValidationSchema,
  applicationValidationRunSchema,
  applicationValidationRunRequestSchema,
  applicationValidationRunResponseSchema
}
