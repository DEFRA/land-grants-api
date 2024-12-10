import { hasMinimumParcelArea } from './has-min-parcel-area.js'
import { isBelowMoorlandLine } from './is-below-moorland-line.js'
import { isSSSI } from './is-sssi.js'
import { isForWholeParcelArea } from './is-for-whole-parcel-area.js'
import { isLessThanMaximumParcelArea } from './is-less-than-max-parcel-area.js'
import { noIntersectionWithLayer } from './no-intersection-with-layer.js'
import { supplementAreaMatchesParent } from './supplement-area-matches-parent.js'
import { totalAreaWithException } from './total-area-with-exception.js'
import {
  hasPeatySoil,
  isOutsideSda,
  noHeferFeatures,
  noSSI
} from './tag-based-rules.js'

export const rules = {
  'supplement-area-matches-parent': supplementAreaMatchesParent,
  'is-below-moorland-line': isBelowMoorlandLine,
  'is-sssi': isSSSI,
  'is-for-whole-parcel-area': isForWholeParcelArea,
  'has-min-parcel-area': hasMinimumParcelArea,
  'is-less-than-max-parcel-area': isLessThanMaximumParcelArea,
  'is-outside-sda': isOutsideSda,
  'has-peaty-soil': hasPeatySoil,
  'no-sssi': noSSI,
  'no-hefer-features': noHeferFeatures,
  'no-intersection-with-layer': noIntersectionWithLayer,
  'total-area-with-exception': totalAreaWithException
}
