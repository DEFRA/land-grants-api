import Joi from 'joi'

export default Joi.object({ failureMessage: Joi.string() }).optional()
