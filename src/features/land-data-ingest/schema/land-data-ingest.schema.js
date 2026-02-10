import Joi from 'joi'

const cdpUploaderFileSchema = Joi.object({
  fileId: Joi.string(),
  filename: Joi.string(),
  contentType: Joi.string(),
  fileStatus: Joi.string().valid('pending', 'complete', 'rejected'),
  contentLength: Joi.number().integer(),
  checksumSha256: Joi.string(),
  s3Key: Joi.string(),
  s3Bucket: Joi.string(),
  hasError: Joi.boolean(),
  errorMessage: Joi.string()
})

const cdpUploaderCallbackSchema = Joi.object({
  uploadStatus: Joi.string().valid('initiated', 'pending', 'ready').required(),
  numberOfRejectedFiles: Joi.number().integer(),
  metadata: Joi.object(),
  form: Joi.object({
    file: cdpUploaderFileSchema
  })
})

const cdpUploaderCallbackResponseSchema = Joi.object({
  message: Joi.string().required()
}).required()

export { cdpUploaderCallbackSchema, cdpUploaderCallbackResponseSchema }
