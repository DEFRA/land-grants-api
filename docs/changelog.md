# Changelog

## WMP Rate Version Pinning for Claims

### New Features

- **Rate pinning on WMP payment calculation endpoints**:
  - `POST /api/v1/wmp/payments/calculate`
  - `POST /api/v1/wmp/payments/calculate-by-total-area`
  - Both now accept optional `version` (exact action config semantic version, e.g. `"1.1.0"`) or `validationRunId` (resolves the version pinned in a stored application validation run). Supplying both is rejected with `400`.
  - When neither is supplied the latest active config is used — unchanged behaviour for existing callers.
  - Claims should pass the version recorded at agreement creation (`payment.agreementLevelItems[].version` from the original calculate response) so recalculations use the same rate.

### Behaviour

- Supplied `version` that does not exist → `400` (fail closed)
- `validationRunId` that does not exist, or whose results contain no pinned WMP version → `400`
- Audit events (`WMP_PAYMENT_CALCULATED`, `WMP_PAYMENT_TOTAL_CALCULATED`) now include the resolved `rateVersion` and its source (`explicit`, `run` or `latest`)

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
        "availableArea": {
          "unit": "ha",
          "value": 74.017
        },
        "ratePerUnitGbp": 10.6,
        "ratePerAgreementPerYearGbp": 272,
        "sssiConsentRequired": false
      },
      ...
```

### API Endpoints

- **v1**: `POST /parcels` (Deprecated, still available)
- **v2**: `POST /api/v2/parcels` (Active)

### Deprecation

The v1 endpoint remains available but will be deprecated.

## API v2 application validation Endpoint

- **New Endpoint**: `POST /api/v2/application/validate`
- Returns rules results, including SSSI
- New response schema
