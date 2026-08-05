import Joi from 'joi'
import { AVAILABILITY_TYPES } from '~/src/features/common/constants/action_availability.js'

export const actionConfigInputSchema = Joi.object({
  code: Joi.string().required(),
  semanticVersion: Joi.string().required(),
  displayOrder: Joi.number().optional(),
  startDate: Joi.string().isoDate().optional(),
  applicationUnitOfMeasurement: Joi.string().optional(),
  durationYears: Joi.number().optional(),
  payment: Joi.object().allow(null).optional(),
  paymentMethod: Joi.object().optional(),
  landCoverClassCodes: Joi.array().items(Joi.string()).optional(),
  rules: Joi.array().items(Joi.object()).optional(),
  description: Joi.string().optional(),
  sssiEligible: Joi.boolean().optional(),
  hfEligible: Joi.boolean().optional(),
  groupId: Joi.number().integer().allow(null).optional(),
  enabled: Joi.boolean().optional(),
  display: Joi.boolean().optional(),
  guidanceUrl: Joi.string().uri().optional(),
  availability: Joi.object({
    type: Joi.string()
      .valid(...AVAILABILITY_TYPES)
      .optional()
  })
    .allow(null)
    .optional()
}).options({ allowUnknown: true })
