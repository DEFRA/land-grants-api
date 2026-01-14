import Joi from 'joi'

const ingestSuccessResponseSchema = Joi.object({
  message: Joi.string().required(),
  taskId: Joi.number().integer().required()
})

const initiateLandDataUploadSuccessResponseSchema = Joi.object({
  message: Joi.string().required(),
  uploadUrl: Joi.string().required()
})

const initiateLandDataUploadRequestSchema = Joi.object({
  reference: Joi.string().required(),
  customerId: Joi.string().required(),
  resource: Joi.string()
    .required()
    .valid(
      'land_parcels',
      'land_covers',
      'moorland_designations',
      'compatibility_matrix',
      'agreements',
      'actions',
      'actions_config',
      'sssi'
    )
})

export {
  ingestSuccessResponseSchema,
  initiateLandDataUploadSuccessResponseSchema,
  initiateLandDataUploadRequestSchema
}
