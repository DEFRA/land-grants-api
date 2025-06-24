import Joi from 'joi'
import { applicationUnitOfMeasurement } from '~/src/api/common/helpers/measurement.js'

const parcelIdSchema = Joi.string().pattern(/^[A-Za-z0-9]{6}-[0-9]{4}$/)

const parcelActionsSchema = Joi.object({
  parcelId: Joi.string().required(),
  sheetId: Joi.string().required(),
  size: Joi.object({
    unit: Joi.string().valid(applicationUnitOfMeasurement).required(),
    value: Joi.number().min(0).required()
  }).required(),
  actions: Joi.array()
    .items(
      Joi.object({
        code: Joi.string().required(),
        description: Joi.string().required(),
        guidanceUrl: Joi.string().required(),
        availableArea: Joi.object({
          unit: Joi.string().valid(applicationUnitOfMeasurement).required(),
          value: Joi.number().min(0).required()
        }).required()
      }).label('action')
    )
    .required()
}).required()

const parcelSuccessResponseSchema = Joi.object({
  message: Joi.string().required(),
  parcel: parcelActionsSchema
}).label('parcelSuccessResponse')

const availableAreaSchema = Joi.object({
  unit: Joi.string().required(),
  value: Joi.number().required()
})

const actionSchema = Joi.object({
  code: Joi.string().required(),
  description: Joi.string().required(),
  availableArea: availableAreaSchema.optional(),
  guidanceUrl: Joi.string().required()
})

const parcelSchema = Joi.object({
  parcelId: Joi.string().required(),
  sheetId: Joi.string().required(),
  size: Joi.object({
    unit: Joi.string().required(),
    value: Joi.number().required()
  }).optional(),
  actions: Joi.array().items(actionSchema).optional()
})

const parcelsSchema = Joi.object({
  parcelIds: Joi.array().items(parcelIdSchema).required(),
  fields: Joi.array().items(Joi.string()).required()
})

const parcelsSuccessResponseSchema = Joi.object({
  message: Joi.string().valid('success').required(),
  parcels: Joi.array().items(parcelSchema).required()
})

export {
  parcelActionsSchema,
  parcelIdSchema,
  parcelSuccessResponseSchema,
  parcelsSuccessResponseSchema,
  parcelsSchema
}
