# boundary-intersection-consent-required

## What does this rule check?

This rule checks how many metres of the parcel boundary lie inside a data layer, and raises a consent caveat when that length exceeds `toleranceMeters`. It is the boundary-length counterpart to `sssi-consent-required` and `hefer-consent-required`, which measure the parcel's area, and is intended for linear actions such as walls, hedgerows and ditches that sit on the parcel boundary rather than in it.

One executor serves every layer - it is dispatched via `type`, so the rule's `name` in action config is free to identify the caveat (for example `sssi-consent-required`), as `manual-check-required` does.

## Configuration parameters

| Parameter           | Type    | Description                                                                                                             |
| ------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------- |
| `layerName`         | string  | The data layer to check the boundary against: `sssi` or `historic_features`.                                            |
| `caveatCode`        | string  | The caveat code to raise, matching the area rule for the same layer: `ne-consent-required` or `hefer-consent-required`. |
| `caveatDescription` | string  | The message returned to the user when consent is required.                                                              |
| `toleranceMeters`   | integer | Intersecting lengths at or below this raise no caveat.                                                                  |

Example, for SSSI on a linear action:

```json
{
  "name": "sssi-consent-required",
  "type": "boundary-intersection-consent-required",
  "description": "Does the parcel boundary intersect a site of special scientific interest?",
  "config": {
    "layerName": "sssi",
    "caveatCode": "ne-consent-required",
    "caveatDescription": "A consent is required from Natural England",
    "toleranceMeters": 0
  }
}
```

## Why and for whom would it fail?

This rule passes whenever the boundary intersection data and the rule config are present, whether or not consent is required - it fails only when:

- no boundary intersection was supplied for the configured layer, which happens if the action is not measured in metres or the intersection query failed
- `layerName` or `caveatCode` is missing from the rule config

## What remediation is possible if it does fail?

When a caveat is raised the user must obtain the relevant consent - SSSI consent from Natural England, or an SFI HEFER for historic and archaeological features. Consent is outside our scope; the caveat informs the user and gives Caseworking a task, using the same caveat code as the area rules so the two are indistinguishable downstream.

The rule cannot tell where on the boundary the wall or hedge is, only that the boundary touches the layer. Whether the designation covers the feature itself is a manual check by the RPA.
