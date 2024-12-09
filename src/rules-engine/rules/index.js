import { hasMinimumParcelArea } from './has-min-parcel-area.js'
import { isBelowMoorlandLine } from './is-below-moorland-line.js'
import { isForWholeParcelArea } from './is-for-whole-parcel-area.js'
import { isLessThanMaximumParcelArea } from './is-less-than-max-parcel-area.js'
import { noIntersectionWithLayer } from './no-intersection-with-layer.js'
import { supplementAreaMatchesParent } from './supplement-area-matches-parent.js'
import { totalAreaWithException } from './total-area-with-exception.js'

/**
 * @import { Rule } from '../../types.js'
 */

/**
 * @type {Record<string, Rule>}
 */
export const rules = {
  'supplement-area-matches-parent': supplementAreaMatchesParent,
  'is-below-moorland-line': isBelowMoorlandLine,
  'is-for-whole-parcel-area': isForWholeParcelArea,
  'has-min-parcel-area': hasMinimumParcelArea,
  'is-less-than-max-parcel-area': isLessThanMaximumParcelArea,
  'no-intersection-with-layer': noIntersectionWithLayer,
  'total-area-with-exception': totalAreaWithException
}
