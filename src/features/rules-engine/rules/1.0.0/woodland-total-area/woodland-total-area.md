# woodland-total-area

## What does this rule check?

This rule checks that the total area of woodland (young and old combined) does not exceed the total area of the land parcels entered into the agreement.

## Configuration parameters

| Parameter           | Type   | Description                                                                   |
| ------------------- | ------ | ----------------------------------------------------------------------------- |
| `totalWoodlandArea` | number | The combined area (in hectares) of all woodland (young + old) on the holding. |
| `totalParcelArea`   | number | The total area (in hectares) of all land parcels entered into the agreement.  |

## Why and for whom would it fail?

This rule will fail for external users if the total woodland area exceeds the total land parcel area, or if no total woodland area value has been provided.

## What remediation is possible if it does fail?

If this fails, the applicant must review the woodland area figures entered. The combined woodland area (young and old) must not be greater than the total area of land parcels in the agreement.
