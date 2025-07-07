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
        availableArea: Joi.object({
          unit: Joi.string().valid(applicationUnitOfMeasurement).required(),
          value: Joi.number().min(0).required()
        }).optional()
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
  results: Joi.object({
    totalValidLandCoverSqm: Joi.number().optional(),
    stacks: Joi.array().optional(),
    explanations: Joi.array().optional()
  })
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
  fields: Joi.array()
    .items(
      Joi.string().valid(
        'size',
        'actions',
        'actions.availableArea',
        'actions.results'
      )
    )
    .required(),
  currentActions: Joi.array()
    .items(
      Joi.object({
        code: Joi.string().required(),
        quantity: Joi.number().required()
      })
    )
    .optional()
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
