// The compatibility matrix row types this API reads. Each row relates
// `optionCode` to `optionCodeCompat`; a pair with no row cannot share land.

// The two actions are compatible at land use level
const BASE_COMPATIBLE_TYPE = 'BASECO'

// The first option is the base for the second: the second is a supplement of the first
export const SUPPLEMENT_BASE_TYPE = 'SUPBAS'

// The two supplements can stack on the same area
const SUPPLEMENTS_COMPATIBLE_TYPE = 'SUPCO'

// The types read when no other types are asked for
export const DEFAULT_COMPATIBILITY_TYPES = [
  BASE_COMPATIBLE_TYPE,
  SUPPLEMENT_BASE_TYPE
]

// The types under which two actions can overlap in the available area
// calculation: base actions that are compatible, a supplement and its base,
// and supplements that can stack. Supplements without a SUPCO row cannot
// overlap, though they can still sit side by side.
export const LAND_SHARING_COMPATIBILITY_TYPES = [
  BASE_COMPATIBLE_TYPE,
  SUPPLEMENT_BASE_TYPE,
  SUPPLEMENTS_COMPATIBLE_TYPE
]
