# parcel-has-no-intersection-with-data-layer

## What does this rule check?

This rule checks that the parcel associated with the application has no intersection (0%) with the specified data layer.

## Configuration parameters

| Parameter   | Type   | Description                                                            |
| ----------- | ------ | ---------------------------------------------------------------------- |
| `dataLayer` | string | The data layer to check for no intersection (e.g. "moorland", "sssi"). |

## Why and for whom would it fail?

This rule could fail for external users if the parcel they are applying for intersects with the specified data layer. This could happen if the parcel is incorrectly mapped, or if the data layer itself is outdated or inaccurate.

## What remediation is possible if it does fail?

If this fails, the only remediation is to update the parcel boundaries or the data layer to ensure there is no intersection.
