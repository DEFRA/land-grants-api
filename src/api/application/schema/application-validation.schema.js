import Joi from 'joi'

const applicationValidationSchema = Joi.object({
  applicationId: Joi.string().required(),
  requester: Joi.string().required(),
  applicantCrn: Joi.string().required(),
  sbi: Joi.number().integer().required(),
  landActions: Joi.array()
    .items(
      Joi.object({
        sheetId: Joi.string().required(),
        parcelId: Joi.string().required(),
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
    .min(1)
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

const applicationValidationRunResponseSchema = Joi.object({
  message: Joi.string().required(),
  applicationValidationRun: applicationValidationRunSchema
})

const applicationValidationRunRequestSchema = Joi.object({
  id: Joi.number().integer().required()
})

const applicationValidationRunsRequestSchema = Joi.object({
  applicationId: Joi.string().required()
})

const applicationValidationResponseSchema = Joi.object({
  message: Joi.string().required(),
  id: Joi.number().integer().required(),
  errorMessages: Joi.array().items(
    Joi.object({
      code: Joi.string().required(),
      description: Joi.string().required(),
      sheetId: Joi.string().required(),
      parcelId: Joi.string().required(),
      passed: Joi.boolean().required()
    })
  ),
  valid: Joi.boolean().required()
})

const applicationValidationRunsResponseSchema = Joi.alternatives(
  Joi.object({
    message: Joi.string().required(),
    applicationValidationRuns: Joi.array().items(applicationValidationRunSchema)
  }),
  Joi.object({
    message: Joi.string().required(),
    applicationValidationRuns: Joi.array().items({
      id: Joi.number().integer().required(),
      created_at: Joi.date().required()
    })
  })
)

export {
  applicationValidationSchema,
  applicationValidationRunSchema,
  applicationValidationRunRequestSchema,
  applicationValidationRunResponseSchema,
  applicationValidationResponseSchema,
  applicationValidationRunsRequestSchema,
  applicationValidationRunsResponseSchema
}
