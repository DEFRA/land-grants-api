# Changelog

## API v2 Payment Calculation Endpoint

### New Features

- **New Endpoint**: `POST /api/v2/payments/calculate`
  - Version fields returned as semantic version string (v1 returns a number)
  - Same functionality as v1 with improved response structure
  - Affected: `payment.parcelItems[].version`, `payment.agreementLevelItems[].version`

### API Endpoints

- **v1**: `POST /payments/calculate` (Deprecated, still available)
- **v2**: `POST /api/v2/payments/calculate` (Active)

### Database Changes

- Added semantic versioning columns to `actions_config`: `major_version`, `minor_version`, `patch_version`
- See `changelog/db.changelog-1.41.xml` for migration details

### Deprecation

The v1 endpoint remains available but will be deprecated.

## API v2 Parcels Endpoint

### New Features

- **New Endpoint**: `POST /api/v2/parcels`
  - The `sssiConsentRequired` field when requested will return the SSSI consent status for a single parcel only, ignored when request contains mupltiple `parcelIds`
  - Same functionality as v1 with improved response structure

New request payload:

```
{
  "parcelIds": ["SD6162-1911"],
  "fields": ["size", "actions", "actions.sssiConsentRequired"]
}
```

Updated response:

```
{
    "message": "success",
    "parcels": [{
      "parcelId": "1911",
      "sheetId": "SD6162",
      "size": {
        "unit": "ha",
        "value": 74.7278
      },
      "actions": [
      {
        "code": "CMOR1",
        "description": "Assess moorland and produce a written record",
        "availability": {
          "unit": "ha",
          "value": 74.017
        },
        "isAvailable": true,
        "ratePerUnitGbp": 10.6,
        "ratePerAgreementPerYearGbp": 272,
        "sssiConsentRequired": false
      },
      ...
```

### Action availability

Every action carries `isAvailable`. An action that cannot be applied for on the
parcel at all reports `false`, with an `unavailableReason` giving a code, a
human-readable default and the figures behind it. The code is the contract;
consumers may key their own copy off it rather than show the reason text.

```
{
  "code": "CMOR1",
  "availability": { "unit": "ha", "value": 0 },
  "isAvailable": false,
  "unavailableReason": {
    "code": "existing-actions-do-not-fit",
    "reason": "Your existing actions do not fit on this land parcel. Please contact the RPA to resolve this.",
    "metadata": {
      "existingActions": [
        { "actionCode": "CMOR1", "areaHa": 3.2 },
        { "actionCode": "UPL1", "areaHa": 2.63 }
      ]
    }
  }
}
```

| Code                          | Raised when                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `existing-actions-do-not-fit` | The parcel's recorded actions cannot all be accommodated - they cannot be arranged on its land covers, or overrun its boundary |
| `no-availability`             | The calculated availability is `0` - nothing is left for the action                                                            |
| `rule-failed`                 | One of the action's rules that needs no applied-for quantity failed, such as a linear action's `minimum-length`                |

Only `existing-actions-do-not-fit` points to a problem with the parcel's records;
the others are the action simply not fitting what is there.

`availability.value` reports the calculated figure even when the action is
unavailable for another reason, such as a failed rule.

`parcel-too-short-for-action` and `insufficient-length-remaining` are no longer
returned. A linear action whose available length is below its minimum is now
reported by its `minimum-length` rule, as `rule-failed`, with the rule's own
reason text; one with no length left at all is reported as `no-availability`.

The `metadata` attribute is diagnostic only - no consumer behaviour should
depend on a field being present, so fields may be added or removed without
notice.

An infeasible area calculation previously returned **422 for the whole request**,
hiding every other action on the parcel including those that never competed for
the land - that status is no longer returned by this endpoint.

### Available length

An action measured in `m` now reports the boundary still claimable: the parcel
perimeter less the metres committed to incompatible actions, in whole metres -
it previously reported `null`, leaving consumers without a ceiling.

A perimeter that cannot be read reports `null` rather than `0`, so an unreadable
boundary is never mistaken for one with nothing left on it.

### API Endpoints

- **v1**: `POST /parcels` (Deprecated, still available)
- **v2**: `POST /api/v2/parcels` (Active)

### Deprecation

The v1 endpoint remains available but will be deprecated.

## API v2 application validation Endpoint

- **New Endpoint**: `POST /api/v2/application/validate`
- Returns rules results, including SSSI
- New response schema
