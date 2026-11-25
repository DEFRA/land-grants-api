# supplement-within-base-action-area

## What does this rule check?

This ensures the area of a supplement does not exceed the area of its base actions applied for on
the same land parcel, in the same application. A supplement with several of its base actions on
the land parcel can use the area of them all. The rest of the land parcel, such as other actions,
agreements and land covers, is checked by `applied-for-total-or-partial-available-area`.

Supplements that cannot share land are not yet checked against each other: GRH7_26 at 6 ha and
GRH8_26 at 4 ha both pass on 9 ha of CLIG3_26.

## Configuration parameters

This rule has no configuration parameters.

## Why and for whom would it fail?

This rule fails if the supplement's area is greater than the area of its base actions on the land
parcel, for example 5.0001 ha of GRH7_26 on 5 ha of CLIG3_26:
"The area (5.0001 ha) must not exceed the CLIG3_26 area (5 ha)". With no base action on the land
parcel, that area is 0.

## What remediation is possible if it does fail?

Reduce the supplement's area to no more than the area of its base actions, or apply for more of the
base action.
