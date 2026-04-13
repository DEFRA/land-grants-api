import { parcelHasIntersectionWithDataLayer } from './1.0.0/parcel-has-intersection-with-data-layer.js'
import { appliedForTotalAvailableArea } from './1.0.0/applied-for-total-available-area.js'
import { sssiConsentRequired } from './1.0.0/sssi-consent-required.js'
import { heferConsentRequired } from './1.0.0/hefer-consent-required.js'
import { woodlandMinimumEligibility } from './1.0.0/woodland-minimum-eligibility.js'
import { woodlandTotalArea } from './1.0.0/woodland-total-area.js'
import { parcelIntersectionDoesNotExceedMaximumForDataLayer } from './1.0.0/parcel-intersection-does-not-exceed-maximum-for-data-layer.js'

export const rules = {
  'parcel-has-intersection-with-data-layer-1.0.0':
    parcelHasIntersectionWithDataLayer,
  'applied-for-total-available-area-1.0.0': appliedForTotalAvailableArea,
  'sssi-consent-required-1.0.0': sssiConsentRequired,
  'hefer-consent-required-1.0.0': heferConsentRequired,
  'parcel-has-minimum-eligibility-for-woodland-management-plan-1.0.0':
    woodlandMinimumEligibility,
  'total-area-not-exceed-land-parcels-woodland-management-plan-1.0.0':
    woodlandTotalArea,
  'parcel-intersection-does-not-exceed-maximum-for-data-layer-1.0.0':
    parcelIntersectionDoesNotExceedMaximumForDataLayer
}
