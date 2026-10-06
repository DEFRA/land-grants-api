// Why an action cannot be applied for on a parcel at all, as opposed to a
// validation failure or a caveat, both of which presume the applicant has
// already chosen it. The code is the contract; grants-ui may key its own copy
// off it rather than show the reason text.
export const EXISTING_ACTIONS_DO_NOT_FIT = 'existing-actions-do-not-fit'
export const PARCEL_TOO_SHORT_FOR_ACTION = 'parcel-too-short-for-action'
export const INSUFFICIENT_LENGTH_REMAINING = 'insufficient-length-remaining'

export const UNAVAILABLE_REASON_CODES = [
  EXISTING_ACTIONS_DO_NOT_FIT,
  PARCEL_TOO_SHORT_FOR_ACTION,
  INSUFFICIENT_LENGTH_REMAINING
]

export const EXISTING_ACTIONS_DO_NOT_FIT_REASON =
  'Your existing actions do not fit on this land parcel. Please contact the RPA to resolve this.'
export const EXISTING_ACTIONS_DO_NOT_FIT_ON_LENGTH_REASON =
  'Your existing actions do not fit on the available length for this land parcel. Please contact the RPA to resolve this.'
