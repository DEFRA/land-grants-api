import Joi from 'joi'

const MAX_ZOOM = 22
const MAX_PARCEL_IDS = 1000

const parcelTilesParamsSchema = Joi.object({
  z: Joi.number().integer().min(0).max(MAX_ZOOM).required(),
  x: Joi.number().integer().min(0).required(),
  y: Joi.number().integer().min(0).required()
}).custom((value, helpers) => {
  const max = 2 ** value.z
  if (value.x >= max || value.y >= max) {
    return helpers.error('any.invalid')
  }
  return value
})

const parcelIdsSchema = Joi.array()
  .items(Joi.string().pattern(/^[A-Za-z0-9]+-[0-9]+$/))
  .min(1)
  .max(MAX_PARCEL_IDS)
  .required()

const parcelTilesPayloadSchema = Joi.object({
  parcelIds: parcelIdsSchema
})

export {
  MAX_ZOOM,
  parcelIdsSchema,
  parcelTilesParamsSchema,
  parcelTilesPayloadSchema
}
