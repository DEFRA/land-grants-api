import Joi from 'joi'

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
      'sssi',
      'registered_battlefields',
      'shine',
      'scheduled_monuments',
      'registered_parks_gardens',
      'action_sssi_hf_mapping'
    ),
  ingestId: Joi.number(),
  filename: Joi.string()
})

export {
  initiateLandDataUploadSuccessResponseSchema,
  initiateLandDataUploadRequestSchema
}
