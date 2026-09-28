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
      "totalValidLandCoverHa": 4.12,
      "existingActionsAreaHa": 5.83,
      "existingActions": [
        { "actionCode": "CMOR1", "areaHa": 3.2 },
        { "actionCode": "UPL1", "areaHa": 2.63 }
      ]
    }
  }
}
```

| Code                                       | Raised when                                                                                                                        |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `existing-actions-do-not-fit`              | The available area calculation is infeasible for this action - the parcel's recorded actions cannot be arranged on its land covers |
| `existing-actions-exceed-available-length` | Too little boundary is left for the action's configured minimum length                                                             |
| `parcel-too-short-for-action`              | The parcel's whole perimeter is below that minimum                                                                                 |

An unavailable action reports an `availability.value` of `0`, whatever its unit.
There is no quantity a consumer could submit that validation would accept, so
there is no ceiling to offer; the real figure is in `unavailableReason.metadata`.

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
