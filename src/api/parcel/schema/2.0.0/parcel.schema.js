import Joi from 'joi'

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
  ratePerAgreementPerYearGbp: Joi.number().optional(),
  sssiConsentRequired: Joi.boolean().optional()
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

const parcelsSuccessResponseSchemaV2 = Joi.object({
  message: Joi.string().valid('success').required(),
  parcels: Joi.array().items(parcelSchema).required()
})

export { parcelsSuccessResponseSchemaV2 }
