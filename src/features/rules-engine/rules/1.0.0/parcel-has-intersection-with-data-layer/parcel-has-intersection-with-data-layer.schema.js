import Joi from 'joi'

export default Joi.object({
  layerName: Joi.string().required(),
  minimumIntersectionPercent: Joi.number().required(),
  tolerancePercent: Joi.number().required(),
  failureMessage: Joi.string()
})
