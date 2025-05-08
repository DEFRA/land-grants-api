import Joi from 'joi'

const PaymentCalculateResponseSchema = Joi.object({
  message: Joi.string().required(),
  payment: Joi.object({
    total: Joi.number().precision(2).required()
  }).required()
})

export { PaymentCalculateResponseSchema }
