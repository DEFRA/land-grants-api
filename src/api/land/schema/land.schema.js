import Joi from 'joi'

const landParcelIdSchema = Joi.string().pattern(/^[A-Za-z0-9]{6}-[0-9]{4}$/)

const landParcelSchema = Joi.object({
  parcelId: Joi.string().required(),
  sheetId: Joi.string().required(),
  areaSqm: Joi.number().positive().required(),
  shape: Joi.string().required(),
  validFrom: Joi.date().required(),
  validTo: Joi.date().optional(),
  lastUpdated: Joi.date().required()
}).required()

const landParcelsSuccessResponseSchema = Joi.object({
  message: Joi.string().required(),
  landParcels: Joi.array().items(landParcelSchema)
})

export {
  landParcelSchema,
  landParcelIdSchema,
  landParcelsSuccessResponseSchema
}
