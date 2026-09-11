# minimum-length

## What does this rule check?

This rule checks that the length applied for on a linear action is at least the configured minimum, and no more than the length the land parcel has available.

The available length is the parcel boundary less any length already committed to incompatible actions, from both existing agreements and other actions in the same submission. It is supplied to the rule as `landParcel.availability`. Tickets and policy documents refer to it as the "Available length".

Checks run in this order, and the order matters:

1. Minimum length is not configured
2. Configured minimum is greater than the available length
3. Applied for length is below the configured minimum
4. Applied for length is above the available length

The second check runs before the third so that an applicant on a parcel with no room left is told the action does not fit, rather than being told to enter more length than the parcel holds.

## Why the available length can be zero

A boundary can legitimately be committed beyond its own length. Actions paid per side, such as BND2 and CHRW2, allow up to twice the boundary to be claimed, while the calculation treats a boundary as a single run of metres. Other causes are a parcel perimeter that differs from the boundary feature measured on the ground, legacy agreements never checked against that perimeter, and option codes absent from the compatibility matrix, which are treated as incompatible and deducted in full.

`landParcel.availability` is therefore floored at zero. An over-committed boundary reports zero rather than a negative figure, which would otherwise reach the applicant as "enter a value that is no more than -500 m". A parcel whose boundary geometry cannot be read also reports zero.

The two are told apart by `landParcel.boundaryLength`, which carries the parcel's own `totalMeters` and the `incompatibleMeters` already committed. The rule writes both into its explanation, so a caseworker can see whether a parcel has no boundary data or a boundary that is already spoken for. It is absent for actions that are not measured in metres, and the explanation omits that line when it is.

## Configuration parameters

| Parameter        | Type   | Description                                                               |
| ---------------- | ------ | ------------------------------------------------------------------------- |
| `minimumLengthM` | number | The minimum length in metres that may be applied for. A positive integer. |

Lengths are whole metres throughout - the rule performs no rounding of its own.

## Why and for whom would it fail?

This rule fails for external users who apply for a length below the action's policy minimum, or above what the parcel has available. It also fails for internal reasons if the action's configuration omits `minimumLengthM`, or if the configured minimum is larger than any length the parcel could offer.

## What remediation is possible if it does fail?

An applicant can enter a length at or above the minimum and at or below the available length, or choose a different parcel. Where the failure is a configuration problem, remediation is to correct `minimumLengthM` in `grants-config-land-grants` and release a new action config version.
