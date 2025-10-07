import Joi from 'joi'

const caseManagementApplicationValidationRunRequestSchema = Joi.object({
  id: Joi.number().integer().required()
})

// Schema for paragraph component
const paragraphComponentSchema = Joi.object({
  component: Joi.string().valid('paragraph').required(),
  text: Joi.string().allow('').required()
})

// Schema for status component
const statusComponentSchema = Joi.object({
  component: Joi.string().valid('status').required(),
  text: Joi.string().required(),
  colour: Joi.string()
    .valid('red', 'green', 'yellow', 'blue', 'grey')
    .required(),
  classes: Joi.string().optional()
})

// Schema for heading component
const headingComponentSchema = Joi.object({
  component: Joi.string().valid('heading').required(),
  text: Joi.string().required(),
  level: Joi.number().integer().min(1).max(6).required(),
  id: Joi.string().optional()
})

// Schema for summary items (can be text items or status components)
const summaryItemSchema = Joi.alternatives().try(
  Joi.object({
    text: Joi.string().required(),
    classes: Joi.string().required()
  }),
  statusComponentSchema
)

// Forward reference for details component (for recursive structure)
const detailsComponentSchema = Joi.object({
  component: Joi.string().valid('details').required(),
  summaryItems: Joi.array().items(summaryItemSchema).min(1).required(),
  items: Joi.array().items(Joi.link('#component')).min(1).required()
}).id('details')

// Combined component schema (for use in details items)
const componentSchema = Joi.alternatives()
  .try(
    paragraphComponentSchema,
    headingComponentSchema,
    detailsComponentSchema,
    statusComponentSchema
  )
  .id('component')

// Response schema for application validation run
const caseManagementApplicationValidationRunResponseSchema = Joi.object({
  message: Joi.string().required(),
  response: Joi.array().items(componentSchema).required()
})

export {
  caseManagementApplicationValidationRunRequestSchema,
  caseManagementApplicationValidationRunResponseSchema
}
