import Joi from 'joi'

export default Joi.object({
  layerName: Joi.string().required(),
  caveatCode: Joi.string().required(),
  caveatDescription: Joi.string().required(),
  toleranceMeters: Joi.number()
})
