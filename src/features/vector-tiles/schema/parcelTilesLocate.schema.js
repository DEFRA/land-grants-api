import Joi from 'joi'
import { parcelIdsSchema } from '~/src/features/vector-tiles/schema/parcelTiles.schema.js'

const parcelTilesLocatePayloadSchema = Joi.object({
  parcelIds: parcelIdsSchema
})

const parcelTilesLocateSuccessResponseSchema = Joi.object({
  message: Joi.string().valid('success').required(),
  bbox: Joi.object({
    minLng: Joi.number().required(),
    minLat: Joi.number().required(),
    maxLng: Joi.number().required(),
    maxLat: Joi.number().required()
  }).required()
})

export {
  parcelTilesLocatePayloadSchema,
  parcelTilesLocateSuccessResponseSchema
}
