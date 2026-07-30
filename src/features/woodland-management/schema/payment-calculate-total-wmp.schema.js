import Joi from 'joi';

export const paymentCalculateTotalWMPSchema = Joi.object({
  totalAreaHa: Joi.number().min(0).required(),
  applicationId: Joi.string().required(),
  sbi: Joi.string().required(),
  crn: Joi.number().optional()
});
