import Joi from 'joi'

const parcelIdSchema = Joi.string().pattern(/^[A-Za-z0-9]{6}-[0-9]{4}$/)

const parcelActionsSchema = Joi.object({
  parcelId: Joi.string().required(),
  sheetId: Joi.string().required(),
  size: Joi.object({
    unit: Joi.string().valid('ha').required(),
    value: Joi.number().positive().required()
  }).required(),
  actions: Joi.array()
    .items(
      Joi.object({
        code: Joi.string().required(),
        description: Joi.string().required(),
        availableArea: Joi.object({
          unit: Joi.string().valid('ha').required(),
          value: Joi.number().positive().required()
        }).required()
      })
    )
    .required()
}).required()

const parcelSuccessResponseSchema = Joi.object({
  message: Joi.string().required(),
  parcel: parcelActionsSchema
})

export { parcelActionsSchema, parcelIdSchema, parcelSuccessResponseSchema }
