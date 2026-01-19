import Joi from 'joi'

const cdpUploaderFileSchema = Joi.object({
  fileId: Joi.string().required(),
  filename: Joi.string().required(),
  contentType: Joi.string().required(),
  fileStatus: Joi.string().valid('pending', 'complete', 'rejected').required(),
  contentLength: Joi.number().integer().required(),
  checksumSha256: Joi.string().required(),
  s3Key: Joi.string().required(),
  s3Bucket: Joi.string().required()
})

const cdpUploaderFileErrorSchema = Joi.object({
  hasError: Joi.boolean(),
  errorMessage: Joi.string()
})

const cdpUploaderCallbackSchema = Joi.object({
  uploadStatus: Joi.string().valid('initiated', 'pending', 'ready').required(),
  numberOfRejectedFiles: Joi.number().integer(),
  metadata: Joi.object(),
  form: Joi.object({
    file: Joi.alternatives().try(
      cdpUploaderFileSchema,
      cdpUploaderFileErrorSchema
    )
  }).required()
})

const cdpUploaderCallbackResponseSchema = Joi.object({
  message: Joi.string().required()
}).required()

export { cdpUploaderCallbackSchema, cdpUploaderCallbackResponseSchema }
