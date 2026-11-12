import Joi from 'joi'
import { AVAILABILITY_TYPES } from '../../common/constants/action_availability.js'
import { UNIT_TYPES } from '../../common/constants/unit_type.js'
import { ruleSchema } from '../../rules-engine/rules/schemas.js'

// Relative imports only: the schemas package copies this file and its imports as they are

const paymentSchema = Joi.object({
  ratePerUnitGbp: Joi.number(),
  ratePerAgreementPerYearGbp: Joi.number()
})

const paymentTierSchema = Joi.object({
  flatRateGbp: Joi.number(),
  lowerLimitHa: Joi.number(),
  upperLimitHa: Joi.number().allow(null),
  ratePerUnitGbp: Joi.number()
})

const paymentMethodConfigSchema = Joi.object({
  ratePerUnitGbp: Joi.number(),
  ratePerAgreementPerYearGbp: Joi.number(),
  tiers: Joi.array().items(paymentTierSchema),
  newWoodlandMaxPercent: Joi.number()
}).unknown(true)

const paymentMethodSchema = Joi.object({
  name: Joi.string().required(),
  version: Joi.string(),
  config: paymentMethodConfigSchema
})

const availabilitySchema = Joi.object({
  type: Joi.string()
    .valid(...AVAILABILITY_TYPES)
    .required()
})

const actionConfigSchema = Joi.object({
  code: Joi.string().required(),
  description: Joi.string().required(),
  display: Joi.boolean().required(),
  displayOrder: Joi.number().required(),
  durationYears: Joi.number().required(),
  enabled: Joi.boolean().required(),
  groupId: Joi.number().integer().allow(null).required(),
  applicationUnitOfMeasurement: Joi.string()
    .valid(...UNIT_TYPES)
    .required(),
  startDate: Joi.string().isoDate().required(),
  semanticVersion: Joi.string().required(),
  guidanceUrl: Joi.string().uri(),
  availability: availabilitySchema,
  landCoverClassCodes: Joi.array().items(Joi.string()),
  payment: paymentSchema.allow(null).required(),
  paymentMethod: paymentMethodSchema.required(),
  rules: Joi.array().items(ruleSchema).required(),
  displayUnit: Joi.string(),
  displayUnitPlural: Joi.string(),
  rotationType: Joi.string()
})

/**
 * Checks an action config against the schema, reporting every problem rather than the first
 * @param {object} actionConfig - An action config as published by the grants config repo
 * @returns {{ error?: Joi.ValidationError }}
 */
export const validateActionConfig = (actionConfig) => {
  const { error } = actionConfigSchema.validate(actionConfig, {
    abortEarly: false
  })
  return { error }
}
