import Joi from 'joi'

export const paymentCalculateTotalWMPSchema = Joi.object({
  // The total area of the WMP application
  totalAreaHa: Joi.number().min(0).required(),
  // The total area on the original WMP application, before adjustments which may be later made
  // by the forestry commission
  originalTotalAreaHa: Joi.number().min(0).optional(),
  applicationId: Joi.string().required(),
  sbi: Joi.string().required(),
  crn: Joi.string().optional(),
  startDate: Joi.date().optional()
})
