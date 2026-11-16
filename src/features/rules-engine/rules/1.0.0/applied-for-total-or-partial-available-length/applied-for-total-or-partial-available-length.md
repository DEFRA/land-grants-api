# applied-for-total-or-partial-available-length

## What does this rule check?

This ensures the length applied for on a linear action does not exceed the available length for the parcel/action combination. Any length up to and including the available length passes.

The available length is supplied to the rule as `landParcel.availability`. How it is calculated, and why it can be zero, is described in [minimum-length](minimum-length.md).

This rule replaces `available-length`, which wrongly required the applied for length to equal the available length. `available-length` remains registered against this rule so that published action configs referencing it keep working.

## Configuration parameters

This rule has no configuration parameters.

## Why and for whom would it fail?

This rule fails for external users who apply for more length than the parcel has available.

## What remediation is possible if it does fail?

The applied for length should be corrected so that it is no more than the available length.
