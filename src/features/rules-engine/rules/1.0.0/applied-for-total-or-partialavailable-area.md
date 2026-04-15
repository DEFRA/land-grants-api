# applied-for-total-or-partialavailable-area

## What does this rule check?

This ensures the area applied for is at least the configured minimum and does not exceed the
available area for the parcel/action combination.

## Configuration parameters

- `minimumAppliedHa`: The minimum area that can be applied for (in hectares).

## Why and for whom would it fail?

This rule fails if the user applies for less than the configured minimum area, applies for more
than the available area, or if required area values are missing/invalid.

## What remediation is possible if it does fail?

The application amount should be corrected so that it falls within the valid range:
`minimumAppliedHa` to the available area.
