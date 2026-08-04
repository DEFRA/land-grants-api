import Joi from 'joi'
import { UNIT_TYPES } from '~/src/features/common/constants/unit_type.js'
import { AVAILABLE_AREA_TYPES } from '~/src/features/common/constants/action_metadata.js'

const parcelIdSchema = Joi.string().pattern(/^[A-Za-z0-9]{6}-[0-9]{4}$/)

const availableAreaSchema = Joi.object({
  unit: Joi.string().required(),
  value: Joi.number().required()
})

const actionMetadataSchema = Joi.object({
  guidance_link: Joi.string().uri().optional(),
  available_area_type: Joi.string()
    .valid(...AVAILABLE_AREA_TYPES)
    .optional()
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
  sssiConsentRequired: Joi.boolean().optional(),
  heferRequired: Joi.boolean().optional(),
  version: Joi.string().optional(),
  metadata: actionMetadataSchema.optional()
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
  sbi: Joi.string().required(),
  parcelIds: Joi.array().items(parcelIdSchema).required(),
  fields: Joi.array()
    .items(
      Joi.string().valid(
        'size',
        'actions',
        'actions.results',
        'actions.sssiConsentRequired',
        'actions.heferRequired',
        'actions.metadata',
        'groups'
      )
    )
    .required(),
  plannedActions: Joi.array()
    .items(
      Joi.object({
        actionCode: Joi.string().required(),
        quantity: Joi.number().required(),
        unit: Joi.string()
          .valid(...UNIT_TYPES)
          .required()
      })
    )
    .optional()
})

const groupSchema = Joi.object({
  name: Joi.string().required(),
  actions: Joi.array().items(Joi.string()).required()
})

const parcelsSuccessResponseSchema = Joi.object({
  message: Joi.string().valid('success').required(),
  parcels: Joi.array().items(parcelSchema).required(),
  groups: Joi.array().items(groupSchema).optional()
})

export { parcelsSchema, parcelsSuccessResponseSchema }
