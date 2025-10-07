import Joi from 'joi'

const caseManagementApplicationValidationRunRequestSchema = Joi.object({
  id: Joi.number().integer().required()
})

export { caseManagementApplicationValidationRunRequestSchema }
