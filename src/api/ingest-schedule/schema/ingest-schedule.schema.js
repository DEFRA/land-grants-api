import Joi from 'joi'

const ingestScheduleSuccessResponseSchema = Joi.object({
  message: Joi.string().required(),
  taskId: Joi.number().integer().required()
})

export { ingestScheduleSuccessResponseSchema }
