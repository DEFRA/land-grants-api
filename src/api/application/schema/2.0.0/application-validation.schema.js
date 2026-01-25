import Joi from 'joi'

const applicationValidationResponseSchemaV2 = Joi.object({
  message: Joi.string().required(),
  id: Joi.number().integer().required(),
  actions: Joi.array().items(
    Joi.object({
      actionCode: Joi.string().required(),
      description: Joi.string().required(),
      sheetId: Joi.string().required(),
      parcelId: Joi.string().required(),
      hasPassed: Joi.boolean().required(),
      rules: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          description: Joi.string().required(),
          caveats: Joi.array().items(
            Joi.object({
              name: Joi.string().required(),
              description: Joi.string().required(),
              metadata: Joi.object()
            })
          )
        })
      )
    })
  ),
  valid: Joi.boolean().required()
})

export { applicationValidationResponseSchemaV2 }
