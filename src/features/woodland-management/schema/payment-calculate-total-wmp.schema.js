import Joi from 'joi'

export const paymentCalculateTotalWMPSchema = Joi.object({
  totalAreaHa: Joi.number().min(0).required(),
  applicationId: Joi.string().required(),
  sbi: Joi.string().required(),
  crn: Joi.string().optional(),
  startDate: Joi.date().optional(),
  // Rate pinning for claims: an exact action config semantic version.
  // When present the calculation uses that specific version instead of the
  // latest active config, ensuring the same rate as the original agreement.
  version: Joi.string()
    .pattern(/^\d+\.\d+\.\d+$/, 'semantic version')
    .optional()
})
