import Joi from 'joi'
import {
  MAX_ZOOM,
  parcelIdsSchema
} from '~/src/features/vector-tiles/schema/parcelTiles.schema.js'

const parcelTilesLocatePayloadSchema = Joi.object({
  parcelIds: parcelIdsSchema
})

const parcelTilesLocateSuccessResponseSchema = Joi.object({
  message: Joi.string().valid('success').required(),
  tile: Joi.object({
    z: Joi.number().integer().min(0).max(MAX_ZOOM).required(),
    x: Joi.number().integer().min(0).required(),
    y: Joi.number().integer().min(0).required()
  }).required()
})

export {
  parcelTilesLocatePayloadSchema,
  parcelTilesLocateSuccessResponseSchema
}
