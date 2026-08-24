import Joi from 'joi'

export const paymentCalculateTotalWMPSchema = Joi.object({
  totalAreaHa: Joi.number().min(0).required(),
  applicationId: Joi.string().required(),
  sbi: Joi.string().required(),
  crn: Joi.string().optional(),
  startDate: Joi.date().optional(),
  // Rate pinning for claims: either an exact action config semantic version,
  // or a validation run id whose stored results carry the pinned version.
  // At most one may be supplied; when neither is present the latest active
  // config is used (backwards compatible default).
  version: Joi.string()
    .pattern(/^\d+\.\d+\.\d+$/, 'semantic version')
    .optional(),
  validationRunId: Joi.number().integer().positive().optional()
})
  .oxor('version', 'validationRunId')
  .messages({
    'object.oxor':
      '{{#label}} must not contain both "version" and "validationRunId"'
  })
