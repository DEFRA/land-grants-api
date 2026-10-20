import Joi from 'joi'

export default Joi.object({
  layerName: Joi.string().required(),
  maximumIntersectionPercent: Joi.number().required(),
  tolerancePercent: Joi.number(),
  failureMessage: Joi.string()
})
