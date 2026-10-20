import Joi from 'joi'

export default Joi.object({ minimumLengthM: Joi.number().required() })
