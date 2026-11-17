import Joi from 'joi'

export default Joi.object({
  minimumParcelSizeSqm: Joi.number(),
  maximumParcelSizeSqm: Joi.number()
}).or('minimumParcelSizeSqm', 'maximumParcelSizeSqm')
