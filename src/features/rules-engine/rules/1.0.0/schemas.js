import appliedForTotalAvailableAreaSchema from './applied-for-total-available-area/applied-for-total-available-area.schema.js'
import appliedForTotalOrPartialAvailableAreaSchema from './applied-for-total-or-partial-available-area/applied-for-total-or-partial-available-area.schema.js'
import appliedForTotalOrPartialAvailableLengthSchema from './applied-for-total-or-partial-available-length/applied-for-total-or-partial-available-length.schema.js'
import boundaryIntersectionConsentRequiredSchema from './boundary-intersection-consent-required/boundary-intersection-consent-required.schema.js'
import heferConsentRequiredSchema from './hefer-consent-required/hefer-consent-required.schema.js'
import manualCheckRequiredSchema from './manual-check-required/manual-check-required.schema.js'
import minMaxParcelSizeSchema from './min-max-parcel-size/min-max-parcel-size.schema.js'
import minimumLengthSchema from './minimum-length/minimum-length.schema.js'
import parcelHasIntersectionWithDataLayerSchema from './parcel-has-intersection-with-data-layer/parcel-has-intersection-with-data-layer.schema.js'
import parcelHasMinimumEligibilityForWoodlandManagementPlanSchema from './woodland-minimum-eligibility/woodland-minimum-eligibility.schema.js'
import parcelHasValidLandCoverSchema from './parcel-has-valid-land-cover/parcel-has-valid-land-cover.schema.js'
import parcelIntersectionDoesNotExceedMaximumForDataLayerSchema from './parcel-intersection-does-not-exceed-maximum-for-data-layer/parcel-intersection-does-not-exceed-maximum-for-data-layer.schema.js'
import sssiConsentRequiredSchema from './sssi-consent-required/sssi-consent-required.schema.js'
import totalAreaNotExceedLandParcelsWoodlandManagementPlanSchema from './woodland-total-area/woodland-total-area.schema.js'

// Keyed the same way as ./index.js. Rules that take no config use Joi.forbidden()
export const configSchemaByRuleKey = {
  'applied-for-total-available-area-1.0.0': appliedForTotalAvailableAreaSchema,
  'applied-for-total-or-partial-available-area-1.0.0':
    appliedForTotalOrPartialAvailableAreaSchema,
  'applied-for-total-or-partial-available-length-1.0.0':
    appliedForTotalOrPartialAvailableLengthSchema,
  'available-length-1.0.0': appliedForTotalOrPartialAvailableLengthSchema,
  'boundary-intersection-consent-required-1.0.0':
    boundaryIntersectionConsentRequiredSchema,
  'hefer-consent-required-1.0.0': heferConsentRequiredSchema,
  'manual-check-required-1.0.0': manualCheckRequiredSchema,
  'min-max-parcel-size-1.0.0': minMaxParcelSizeSchema,
  'minimum-length-1.0.0': minimumLengthSchema,
  'parcel-has-intersection-with-data-layer-1.0.0':
    parcelHasIntersectionWithDataLayerSchema,
  'parcel-has-minimum-eligibility-for-woodland-management-plan-1.0.0':
    parcelHasMinimumEligibilityForWoodlandManagementPlanSchema,
  'parcel-has-valid-land-cover-1.0.0': parcelHasValidLandCoverSchema,
  'parcel-intersection-does-not-exceed-maximum-for-data-layer-1.0.0':
    parcelIntersectionDoesNotExceedMaximumForDataLayerSchema,
  'sssi-consent-required-1.0.0': sssiConsentRequiredSchema,
  'total-area-not-exceed-land-parcels-woodland-management-plan-1.0.0':
    totalAreaNotExceedLandParcelsWoodlandManagementPlanSchema
}
