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
  filename: Joi.string().required(),
  type: Joi.string().valid('parcels', 'covers', 'moorland').required()
})

export {
  ingestScheduleSuccessResponseSchema,
  initiateLandDataUploadSuccessResponseSchema,
  initiateLandDataUploadRequestSchema
}
