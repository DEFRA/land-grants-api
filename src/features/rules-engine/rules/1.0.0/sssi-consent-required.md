# sssi-consent-required

## What does this rule check?

This rule checks that the parcel covers associated with the application has an intersection with the SSSI data layer minus `tolerancePercent`.

## Configuration parameters

| Parameter          | Type   | Description                                                                         |
| ------------------ | ------ | ----------------------------------------------------------------------------------- |
| `dataLayer`        | string | The SSSI data layer to check for intersection.                                      |
| `tolerancePercent` | number | The tolerance level for the intersection check as a percentage of the parcel covers |

## Why and for whom would it fail?

This rule could fail for external users if any of the parcel covers intersect with the SSSI layer

## What remediation is possible if it does fail?

If this fails, users must get SSSI consent from Natural England, consent is outside of our scope we aim to simply inform users.
A message stored in action config => caveatDescription, is returned to the user to inform them consent is required to perform the selected action.
