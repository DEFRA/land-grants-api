import Joi from 'joi'

const ingestScheduleSuccessResponseSchema = Joi.object({
  message: Joi.string().required(),
  taskId: Joi.number().integer().required()
})

const initiateLandDataUploadSuccessResponseSchema = Joi.object({
  message: Joi.string().required(),
  uploadUrl: Joi.string().required()
})

const initiateLandDataUploadRequestSchema = Joi.object({
  reference: Joi.string().required(),
  customerId: Joi.string().required()
})

export {
  ingestScheduleSuccessResponseSchema,
  initiateLandDataUploadSuccessResponseSchema,
  initiateLandDataUploadRequestSchema
}
