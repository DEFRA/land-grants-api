import Joi from 'joi'

const applicationValidationResponseSchemaV2 = Joi.object({
  message: Joi.string().required(),
  id: Joi.number().integer().required(),
  actions: Joi.array().items(
    Joi.object({
      actionCode: Joi.string().required(),
      description: Joi.string(),
      sheetId: Joi.string().required(),
      parcelId: Joi.string().required(),
      hasPassed: Joi.boolean().required(),
      rules: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          passed: Joi.boolean().required(),
          reason: Joi.string(),
          description: Joi.string(),
          explanations: Joi.array().items(
            Joi.object({
              title: Joi.string().required(),
              lines: Joi.array().items(Joi.string())
            })
          ),
          caveat: Joi.object({
            code: Joi.string().required(),
            description: Joi.string().required(),
            metadata: Joi.object()
          })
        })
      )
    })
  ),
  valid: Joi.boolean().required()
})

export { applicationValidationResponseSchemaV2 }
