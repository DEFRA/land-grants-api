import Joi from 'joi'

export default Joi.object({
  layerName: Joi.string().required(),
  caveatDescription: Joi.string().required(),
  tolerancePercent: Joi.number().required()
})
