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

// Keyed the same way as ./index.js. Rules that take no config use Joi.forbidden()
export const ruleConfigs = {
  'applied-for-total-available-area-1.0.0': appliedForTotalAvailableArea,
  'applied-for-total-or-partial-available-area-1.0.0':
    appliedForTotalOrPartialAvailableArea,
  'applied-for-total-or-partial-available-length-1.0.0':
    appliedForTotalOrPartialAvailableLength,
  'available-length-1.0.0': appliedForTotalOrPartialAvailableLength,
  'boundary-intersection-consent-required-1.0.0':
    boundaryIntersectionConsentRequired,
  'hefer-consent-required-1.0.0': heferConsentRequired,
  'manual-check-required-1.0.0': manualCheckRequired,
  'min-max-parcel-size-1.0.0': minMaxParcelSize,
  'minimum-length-1.0.0': minimumLength,
  'parcel-has-intersection-with-data-layer-1.0.0':
    parcelHasIntersectionWithDataLayer,
  'parcel-has-minimum-eligibility-for-woodland-management-plan-1.0.0':
    parcelHasMinimumEligibilityForWoodlandManagementPlan,
  'parcel-has-valid-land-cover-1.0.0': parcelHasValidLandCover,
  'parcel-intersection-does-not-exceed-maximum-for-data-layer-1.0.0':
    parcelIntersectionDoesNotExceedMaximumForDataLayer,
  'sssi-consent-required-1.0.0': sssiConsentRequired,
  'total-area-not-exceed-land-parcels-woodland-management-plan-1.0.0':
    totalAreaNotExceedLandParcelsWoodlandManagementPlan
}
