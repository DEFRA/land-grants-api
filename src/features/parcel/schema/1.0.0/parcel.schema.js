import Joi from 'joi'

const parcelIdSchema = Joi.string().pattern(/^[A-Za-z0-9]{6}-[0-9]{4}$/)

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
  }),
  ratePerUnitGbp: Joi.number().required(),
  ratePerAgreementPerYearGbp: Joi.number().optional()
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
    .items(Joi.string().valid('size', 'actions', 'actions.results'))
    .required(),
  plannedActions: Joi.array()
    .items(
      Joi.object({
        actionCode: Joi.string().required(),
        quantity: Joi.number().required(),
        unit: Joi.string().valid('ha', 'sqm').required()
      })
    )
    .optional()
})

const parcelsSuccessResponseSchema = Joi.object({
  message: Joi.string().valid('success').required(),
  parcels: Joi.array().items(parcelSchema).required()
})

export { parcelsSchema, parcelsSuccessResponseSchema }
