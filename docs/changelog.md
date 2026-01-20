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
