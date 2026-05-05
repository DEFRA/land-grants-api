# applied-for-total-or-partial-available-area

## What does this rule check?

This ensures the area applied for is greater than 0 and does not exceed the configured
tolerance-adjusted available area for the parcel/action combination.

## Configuration parameters

- `tolerancePercent`: Additional percentage allowed above available area. If omitted, defaults to `0`.

## Why and for whom would it fail?

This rule fails if the user applies for 0 or less, applies for more than the available area plus
the configured tolerance, or if required area values are missing/invalid.

## What remediation is possible if it does fail?

The application amount should be corrected so that it falls within the valid range:
greater than `0` and no more than available area + `tolerancePercent`.

Maximum allowed area formula:
`availableArea * (1 + tolerancePercent / 100)`.
