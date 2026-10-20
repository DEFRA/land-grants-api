import Joi from 'joi'

export default Joi.object({
  minimumSize: Joi.number().required(),
  minOldWoodlandHa: Joi.number().required()
})
