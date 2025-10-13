# parcel-has-intersection-with-data-layer

## What does this rule check?

This rule checks that the parcel associated with the application has an intersection with the specified data layer of at least `minimumIntersectionPercent` minus `tolerancePercent`.

## Configuration parameters

| Parameter                    | Type   | Description                                                                  |
| ---------------------------- | ------ | ---------------------------------------------------------------------------- |
| `dataLayer`                  | string | The data layer to check for intersection (e.g. "moorland", "sssi").          |
| `minimumIntersectionPercent` | number | The minimum required intersection area as a percentage of the parcel area.   |
| `tolerancePercent`           | number | The tolerance level for the intersection check as a percentage of the parcel |

## Why and for whom would it fail?

This rule could fail for external users if the parcel they are applying for does not intersect with the required data layer. This could happen if the parcel is incorrectly mapped, or if the data layer itself is outdated or inaccurate.

## What remediation is possible if it does fail?

If this fails, the only remediation is to update the parcel boundaries or the data layer to ensure there is sufficient intersection.
