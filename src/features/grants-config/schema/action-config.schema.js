import Joi from 'joi'
import { AVAILABILITY_TYPES } from '../../common/constants/action_availability.js'
import { UNIT_TYPES } from '../../common/constants/unit_type.js'
import { ruleSchema } from '../../rules-engine/rules/schemas.js'

// Relative imports only: the schemas package copies this file and its imports as they are

const paymentSchema = Joi.object({
  ratePerAgreementPerYearGbp: Joi.number(),
  ratePerUnitGbp: Joi.number()
})

const paymentTierSchema = Joi.object({
  flatRateGbp: Joi.number(),
  lowerLimitHa: Joi.number(),
  ratePerUnitGbp: Joi.number(),
  upperLimitHa: Joi.number().allow(null)
})

const paymentMethodConfigSchema = Joi.object({
  newWoodlandMaxPercent: Joi.number(),
  ratePerAgreementPerYearGbp: Joi.number(),
  ratePerUnitGbp: Joi.number(),
  tiers: Joi.array().items(paymentTierSchema)
}).unknown(true)

const paymentMethodSchema = Joi.object({
  config: paymentMethodConfigSchema,
  name: Joi.string().required(),
  version: Joi.string()
})

const availabilitySchema = Joi.object({
  type: Joi.string()
    .valid(...AVAILABILITY_TYPES)
    .required()
})

const actionConfigSchema = Joi.object({
  applicationUnitOfMeasurement: Joi.string()
    .valid(...UNIT_TYPES)
    .required(),
  availability: availabilitySchema,
  code: Joi.string().required(),
  description: Joi.string().required(),
  display: Joi.boolean().required(),
  displayOrder: Joi.number().required(),
  displayUnit: Joi.string(),
  displayUnitPlural: Joi.string(),
  durationYears: Joi.number().required(),
  enabled: Joi.boolean().required(),
  groupId: Joi.number().integer().allow(null).required(),
  guidanceUrl: Joi.string().uri(),
  landCoverClassCodes: Joi.array().items(Joi.string()),
  payment: paymentSchema.allow(null).required(),
  paymentMethod: paymentMethodSchema.required(),
  rotationType: Joi.string(),
  rules: Joi.array().items(ruleSchema).required(),
  semanticVersion: Joi.string().required(),
  startDate: Joi.string().isoDate().required()
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
