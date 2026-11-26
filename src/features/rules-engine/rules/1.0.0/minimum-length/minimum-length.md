# minimum-length

## What does this rule check?

This rule checks that the length applied for on a linear action is at least the configured minimum. That the length is no more than the parcel has available is checked separately, by [applied-for-total-or-partial-available-length](applied-for-total-or-partial-available-length.md).

The available length is the parcel boundary less the boundary already occupied by incompatible actions, from both existing agreements and other actions in the same submission. Incompatible actions that can share a stretch with each other are counted once, in the [best-case arrangement](../../../../../docs/available-length-calculation/alc-explained.md). It is supplied to the rule as `landParcel.availability`. Tickets and policy documents refer to it as the "Available length".

Checks run in this order, and the order matters:

1. Minimum length is not configured
2. Configured minimum is greater than the available length
3. Applied for length is below the configured minimum

The second check runs before the third so that an applicant on a parcel with no room left is told the action does not fit, rather than being told to enter more length than the parcel holds.

## Single-side actions

A single-side action such as BND2 or CHRW2 is paid per face, so its available length is in billed metres, twice the free boundary. The second check therefore compares the available length with the minimum multiplied by the action's billing factor: a 20 m minimum needs 40 m available, which is 20 m of boundary. The reason and explanation give both figures, as "20 m of boundary, 40 m across both sides". The sidedness is supplied to the rule as `landParcel.sidedness`, and an action with none is treated as both-sides.

The third check does not apply the billing factor - an applicant with management control of only one side enters that side alone, so one face of a 20 m boundary, entered as 20 m, is the smallest valid entry. The applied-for length cannot tell one face of a long boundary from both faces of a short one, so whether the boundary itself is long enough is left to the second check.

## When nothing has been applied for

The applied-for quantity is optional. The `/parcels` endpoint runs this rule before anything is applied for, with the available length it has already calculated, so only the first two checks apply there. A failure makes the action unavailable with the `rule-failed` code and the second check's wording as the reason. An action with no length left at all is reported as `no-availability` before its rules run.

## Why the available length can be zero

A boundary can be committed beyond its own length when the records disagree. Existing actions are measured by the boundary they physically occupy, so a single-side action such as BND2 billed on both faces counts for half its billed length and does not cause this on its own. The causes are a parcel perimeter that differs from the boundary feature measured on the ground, legacy agreements never checked against that perimeter, and option codes absent from the compatibility matrix, which are treated as incompatible and deducted in full.

`landParcel.availability` is therefore floored at zero. An over-committed boundary reports zero rather than a negative figure, which would otherwise reach the applicant as "enter a value that is no more than -500 m". A parcel whose boundary geometry cannot be read fails validation with an error instead, since no length the applicant enters could fix it.

When the existing actions cannot all fit the boundary, however they are arranged, the available length is zero whether or not they are incompatible with the action applied for. Validation then reports that the existing actions do not fit, as `/parcels` does, and does not run this rule.

The two are told apart by `landParcel.boundaryLength`, which carries the parcel's own `totalMeters` and the `incompatibleMeters` of boundary already occupied by incompatible actions, both in physical metres. When the existing actions cannot all fit, `incompatibleMeters` is the boundary all of them need, so it is more than `totalMeters`. The rule writes both into its explanation, so a caseworker can see whether a parcel has no boundary data or a boundary that is already spoken for. It is absent for actions that are not measured in metres, and the explanation omits that line when it is.

## Configuration parameters

| Parameter        | Type   | Description                                                                        |
| ---------------- | ------ | ---------------------------------------------------------------------------------- |
| `minimumLengthM` | number | The minimum length of boundary in metres, as GOV.UK states it. A positive integer. |

Lengths are whole metres throughout - the rule performs no rounding of its own.

## Why and for whom would it fail?

This rule fails for external users who apply for a length below the action's policy minimum. It also fails for internal reasons if the action's configuration omits `minimumLengthM`, or if the configured minimum is larger than any length the parcel could offer.

## What remediation is possible if it does fail?

An applicant can enter a length at or above the minimum, or choose a different parcel. Where the failure is a configuration problem, remediation is to correct `minimumLengthM` in `grants-config-land-grants` and release a new action config version.
