import Joi from 'joi'

export default Joi.object({ caveatDescription: Joi.string().required() })
