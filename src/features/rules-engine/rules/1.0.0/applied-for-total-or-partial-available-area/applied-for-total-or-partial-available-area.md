# applied-for-total-or-partial-available-area

## What does this rule check?

This ensures the area applied for is greater than 0 and does not exceed the configured
available area for the parcel/action combination.

## Configuration parameters

This rule has no configuration parameters.

## Why and for whom would it fail?

This rule fails if the user applies for 0 or less, applies for more than the available area, or if
required area values are missing/invalid.

## What remediation is possible if it does fail?

The application amount should be corrected so that it falls within the valid range:
greater than `0` and no more than available area.
