// Why an action cannot be applied for on a parcel at all, as opposed to a
// validation failure or a caveat, both of which presume the applicant has
// already chosen it. The code is the contract; grants-ui may key its own copy
// off it rather than show the reason text.
export const EXISTING_ACTIONS_DO_NOT_FIT = 'existing-actions-do-not-fit'
const EXISTING_ACTIONS_EXCEED_AVAILABLE_LENGTH =
  'existing-actions-exceed-available-length'
const PARCEL_TOO_SHORT_FOR_ACTION = 'parcel-too-short-for-action'

export const UNAVAILABLE_REASON_CODES = [
  EXISTING_ACTIONS_DO_NOT_FIT,
  EXISTING_ACTIONS_EXCEED_AVAILABLE_LENGTH,
  PARCEL_TOO_SHORT_FOR_ACTION
]

// The length codes have a rule behind them and take that rule's wording - the
// area code has none, so it carries its own.
export const EXISTING_ACTIONS_DO_NOT_FIT_REASON =
  'Your existing actions do not fit on this land parcel. Please contact the RPA to resolve this.'
