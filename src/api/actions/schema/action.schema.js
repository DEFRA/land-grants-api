import Joi from 'joi'

export const actionSchema = Joi.object({
  message: Joi.string().required(),
  actions: Joi.array()
    .items(
      Joi.object({
        id: Joi.number().integer().required(),
        code: Joi.string().required(),
        description: Joi.string().required(),
        enabled: Joi.boolean().required(),
        display: Joi.boolean().required(),
        version: Joi.string().required(),
        startDate: Joi.string().required(),
        applicationUnitOfMeasurement: Joi.string().required(),
        durationYears: Joi.number().integer().required(),
        payment: Joi.object({
          ratePerUnitGbp: Joi.number().required(),
          ratePerAgreementPerYearGbp: Joi.number().integer()
        }),
        landCoverClassCodes: Joi.array().items(Joi.string()),
        rules: Joi.array().items(
          Joi.object({
            name: Joi.string().required(),
            config: Joi.object({
              layerName: Joi.string().required(),
              minimumIntersectionPercent: Joi.number().integer().required(),
              tolerancePercent: Joi.number().integer().required()
            })
          })
        ),
        lastUpdated: Joi.date().required()
      })
    )
    .required()
})
