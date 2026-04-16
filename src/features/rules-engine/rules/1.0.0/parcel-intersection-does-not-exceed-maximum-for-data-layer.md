# parcel-intersection-does-not-exceed-maximum-for-data-layer

## What does this rule check?

This rule checks that the parcel associated with the application has an intersection with the specified data layer that is less than or equal to the configured maximum threshold.

## Configuration parameters

| Parameter                    | Type   | Description                                                                  |
| ---------------------------- | ------ | ---------------------------------------------------------------------------- |
| `layerName`                  | string | The data layer to check (e.g. "moorland", "sssi").                           |
| `maximumIntersectionPercent` | number | The maximum allowed intersection percentage before tolerance is applied.     |
| `tolerancePercent`           | number | Additional percentage tolerance added to the maximum intersection threshold. |

## Why and for whom would it fail?

This rule could fail for external users if the parcel they are applying for intersects with the specified data layer above the configured maximum threshold. This could happen if the parcel is incorrectly mapped, or if the data layer itself is outdated or inaccurate.

## What remediation is possible if it does fail?

If this fails, remediation is to update the parcel boundaries or data layer, or adjust the configured maximum and tolerance where policy allows.
