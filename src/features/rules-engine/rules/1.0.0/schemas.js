import Joi from 'joi'
import appliedForTotalAvailableArea from './applied-for-total-available-area/applied-for-total-available-area.schema.js'
import appliedForTotalOrPartialAvailableArea from './applied-for-total-or-partial-available-area/applied-for-total-or-partial-available-area.schema.js'
import appliedForTotalOrPartialAvailableLength from './applied-for-total-or-partial-available-length/applied-for-total-or-partial-available-length.schema.js'
import boundaryIntersectionConsentRequired from './boundary-intersection-consent-required/boundary-intersection-consent-required.schema.js'
import heferConsentRequired from './hefer-consent-required/hefer-consent-required.schema.js'
import manualCheckRequired from './manual-check-required/manual-check-required.schema.js'
import minMaxParcelSize from './min-max-parcel-size/min-max-parcel-size.schema.js'
import minimumLength from './minimum-length/minimum-length.schema.js'
import parcelHasIntersectionWithDataLayer from './parcel-has-intersection-with-data-layer/parcel-has-intersection-with-data-layer.schema.js'
import parcelHasMinimumEligibilityForWoodlandManagementPlan from './woodland-minimum-eligibility/woodland-minimum-eligibility.schema.js'
import parcelHasValidLandCover from './parcel-has-valid-land-cover/parcel-has-valid-land-cover.schema.js'
import parcelIntersectionDoesNotExceedMaximumForDataLayer from './parcel-intersection-does-not-exceed-maximum-for-data-layer/parcel-intersection-does-not-exceed-maximum-for-data-layer.schema.js'
import sssiConsentRequired from './sssi-consent-required/sssi-consent-required.schema.js'
import totalAreaNotExceedLandParcelsWoodlandManagementPlan from './woodland-total-area/woodland-total-area.schema.js'

/**
 * Config schema for each rule, keyed the same way as the rules engine registry
 * (./index.js) minus the version. Rules that take
 * no config use Joi.forbidden(). A test in land-grants-api fails if the two drift.
 */
export const ruleConfigs = {
  'applied-for-total-available-area': appliedForTotalAvailableArea,
  'applied-for-total-or-partial-available-area':
    appliedForTotalOrPartialAvailableArea,
  'applied-for-total-or-partial-available-length':
    appliedForTotalOrPartialAvailableLength,
  'available-length': appliedForTotalOrPartialAvailableLength,
  'boundary-intersection-consent-required': boundaryIntersectionConsentRequired,
  'hefer-consent-required': heferConsentRequired,
  'manual-check-required': manualCheckRequired,
  'min-max-parcel-size': minMaxParcelSize,
  'minimum-length': minimumLength,
  'parcel-has-intersection-with-data-layer': parcelHasIntersectionWithDataLayer,
  'parcel-has-minimum-eligibility-for-woodland-management-plan':
    parcelHasMinimumEligibilityForWoodlandManagementPlan,
  'parcel-has-valid-land-cover': parcelHasValidLandCover,
  'parcel-intersection-does-not-exceed-maximum-for-data-layer':
    parcelIntersectionDoesNotExceedMaximumForDataLayer,
  'sssi-consent-required': sssiConsentRequired,
  'total-area-not-exceed-land-parcels-woodland-management-plan':
    totalAreaNotExceedLandParcelsWoodlandManagementPlan
}

// Config is required unless the schema opts out with .optional()
const configFor = (schema) =>
  schema.describe().flags?.presence ? schema : schema.required()

const ruleKeys = Object.keys(ruleConfigs)

const byRuleKey = {
  switch: Object.entries(ruleConfigs).map(([key, schema]) => ({
    is: key,
    then: configFor(schema)
  }))
}

/**
 * Schema for one entry of an action's `rules` array, from the rules engine's
 * side only: the engine runs `rule.type ?? rule.name`, so that must be a rule
 * it has, and `config` must satisfy that rule. Which rules an action is
 * allowed to use is the action schema's job, not this package's.
 */
export const ruleSchema = Joi.object({
  name: Joi.string()
    .required()
    .when('type', { not: Joi.exist(), then: Joi.valid(...ruleKeys) }),
  type: Joi.string().valid(...ruleKeys),
  description: Joi.string().required(),
  version: Joi.string(),
  config: Joi.when('type', {
    is: Joi.exist(),
    then: Joi.when('type', byRuleKey),
    otherwise: Joi.when('name', byRuleKey)
  })
})
