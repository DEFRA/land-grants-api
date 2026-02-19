# hefer-consent-required

## What does this rule check?

This rule checks that the parcel covers associated with the application has an intersection with the Historic Environment Farm Environment Record (HEFER) data layer minus `tolerancePercent`. The HEFER layer is stored as `historic_features` in the application data.

## Configuration parameters

| Parameter           | Type   | Description                                                                          |
| ------------------- | ------ | ------------------------------------------------------------------------------------ |
| `layerName`         | string | The data layer to check for intersection (typically `historic_features`).            |
| `tolerancePercent`  | number | The tolerance level for the intersection check as a percentage of the parcel covers. |
| `caveatDescription` | string | The message shown to the user when consent is required (from Historic England).      |

## Why and for whom would it fail?

This rule could fail for external users if any of the parcel covers intersect with the historic features layer.

## What remediation is possible if it does fail?

If this fails, users must get a Historic Environment Farm Environment Record from Historic England. Consent is outside of our scope; we aim to simply inform users.
A message stored in action config => caveatDescription is returned to the user to inform them a HEFER is needed to perform the selected action.
