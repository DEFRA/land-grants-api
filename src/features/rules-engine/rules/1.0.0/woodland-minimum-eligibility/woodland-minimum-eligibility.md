# woodland-minimum-eligibility

## What does this rule check?

This rule checks that the holding has a minimum of 0.5ha of woodland over 10 years old. If this threshold is not met, the applicant is not eligible and the calculator will reflect this.

## Configuration parameters

| Parameter                 | Type   | Description                                                          |
| ------------------------- | ------ | -------------------------------------------------------------------- |
| `woodlandAreaOver10Years` | number | The area (in hectares) of woodland over 10 years old on the holding. |

## Why and for whom would it fail?

This rule will fail for external users if the holding has less than 0.5ha of woodland over 10 years old, or if no woodland area value has been provided.

## What remediation is possible if it does fail?

If this fails, the applicant is not eligible for the scheme. They must ensure the holding has at least 0.5ha of woodland over 10 years old before applying.
