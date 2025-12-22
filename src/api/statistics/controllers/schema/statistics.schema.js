import Joi from 'joi'

const statisticsSuccessResponseSchema = Joi.object({
  message: Joi.string().required()
}).required()

export { statisticsSuccessResponseSchema }
