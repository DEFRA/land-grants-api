# supplement-has-base-action

## What does this rule check?

This ensures a supplement is applied for on the same land parcel as one of its base actions, in the
same application. A supplement's base actions are the `SUPBAS` rows of the compatibility matrix
naming it. A base action held only in an existing agreement does not count.

## Configuration parameters

This rule has no configuration parameters.

## Why and for whom would it fail?

This rule fails if none of the supplement's base actions is applied for on the land parcel in the
application, for example GRH7_26 without CLIG3_26:
"GRH7_26 requires the base action CLIG3_26 on the same land parcel". It also fails if the
compatibility matrix has no base action for it, as when the rule is configured on an action that is
not a supplement.

## What remediation is possible if it does fail?

Apply for one of the base actions named in the reason on the same land parcel, or remove the
supplement.
