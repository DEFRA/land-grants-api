// Why an action cannot be applied for on a parcel at all, as opposed to a
// validation failure or a caveat, both of which presume the applicant has
// already chosen it. The code is the contract; grants-ui may key its own copy
// off it rather than show the reason text.
export const EXISTING_ACTIONS_DO_NOT_FIT = 'existing-actions-do-not-fit'
export const RULE_FAILED = 'rule-failed'
export const NO_AVAILABILITY = 'no-availability'
export const EXCEEDS_BASE_ACTION_AREA = 'exceeds-base-action-area'

export const UNAVAILABLE_REASON_CODES = [
  EXISTING_ACTIONS_DO_NOT_FIT,
  RULE_FAILED,
  NO_AVAILABILITY,
  EXCEEDS_BASE_ACTION_AREA
]

export const EXISTING_ACTIONS_DO_NOT_FIT_REASON =
  'Your existing actions do not fit on this land parcel. Please contact the RPA to resolve this.'
export const EXISTING_ACTIONS_DO_NOT_FIT_ON_LENGTH_REASON =
  'Your existing actions do not fit on the available length for this land parcel. Please contact the RPA to resolve this.'

export const NO_AVAILABILITY_REASON =
  'There is no remaining availability for this action'

export const EXCEEDS_BASE_ACTION_AREA_REASON =
  'The quantity for this supplementary action is more than the area of its base action'
