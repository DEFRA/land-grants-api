import { parcelHasIntersectionWithDataLayer } from './parcel-has-intersection-with-data-layer/parcel-has-intersection-with-data-layer.js'
import { appliedForTotalAvailableArea } from './applied-for-total-available-area/applied-for-total-available-area.js'
import { appliedForTotalOrPartialAvailableArea } from './applied-for-total-or-partial-available-area/applied-for-total-or-partial-available-area.js'
import { sssiConsentRequired } from './sssi-consent-required/sssi-consent-required.js'
import { heferConsentRequired } from './hefer-consent-required/hefer-consent-required.js'
import { manualCheckRequired } from './manual-check-required/manual-check-required.js'
import { woodlandMinimumEligibility } from './woodland-minimum-eligibility/woodland-minimum-eligibility.js'
import { woodlandTotalArea } from './woodland-total-area/woodland-total-area.js'
import { parcelIntersectionDoesNotExceedMaximumForDataLayer } from './parcel-intersection-does-not-exceed-maximum-for-data-layer/parcel-intersection-does-not-exceed-maximum-for-data-layer.js'
import { minMaxParcelSize } from './min-max-parcel-size/min-max-parcel-size.js'
import { appliedForTotalOrPartialAvailableLength } from './applied-for-total-or-partial-available-length/applied-for-total-or-partial-available-length.js'
import { minimumLength } from './minimum-length/minimum-length.js'
import { parcelHasValidLandCover } from './parcel-has-valid-land-cover/parcel-has-valid-land-cover.js'
import { boundaryIntersectionConsentRequired } from './boundary-intersection-consent-required/boundary-intersection-consent-required.js'

export const rules = {
  'parcel-has-intersection-with-data-layer-1.0.0':
    parcelHasIntersectionWithDataLayer,
  'applied-for-total-available-area-1.0.0': appliedForTotalAvailableArea,
  'applied-for-total-or-partial-available-area-1.0.0':
    appliedForTotalOrPartialAvailableArea,
  'sssi-consent-required-1.0.0': sssiConsentRequired,
  'hefer-consent-required-1.0.0': heferConsentRequired,
  'manual-check-required-1.0.0': manualCheckRequired,
  'parcel-has-minimum-eligibility-for-woodland-management-plan-1.0.0':
    woodlandMinimumEligibility,
  'total-area-not-exceed-land-parcels-woodland-management-plan-1.0.0':
    woodlandTotalArea,
  'parcel-intersection-does-not-exceed-maximum-for-data-layer-1.0.0':
    parcelIntersectionDoesNotExceedMaximumForDataLayer,
  'min-max-parcel-size-1.0.0': minMaxParcelSize,
  'applied-for-total-or-partial-available-length-1.0.0':
    appliedForTotalOrPartialAvailableLength,
  'available-length-1.0.0': appliedForTotalOrPartialAvailableLength,
  'minimum-length-1.0.0': minimumLength,
  'parcel-has-valid-land-cover-1.0.0': parcelHasValidLandCover,
  'boundary-intersection-consent-required-1.0.0':
    boundaryIntersectionConsentRequired
}
