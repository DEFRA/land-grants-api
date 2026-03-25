# Available Area Test Fixtures

This document explains the optimized test fixture system for the Available Area Calculation Service tests.

## Overview

The Available Area Calculation Service test was optimized to eliminate ~60+ database queries per test run by pre-computing database results into fixture files. This transforms the test from a database-heavy operation into a pure calculation test.

## Architecture

### Before (Slow)
```
Test Run → 14 scenarios × (5-6 DB queries each) = ~70 total DB queries
- createCompatibilityMatrix() × 14 (same query every time) 
- getAvailableAreaDataRequirements() × 14 (4 DB queries each)
- Total time: 30-60+ seconds
```

### After (Fast)
```
Test Run → Load pre-computed fixtures + pure calculations
- Fixtures loaded once from JSON
- No database queries during test execution
- Total time: <2 seconds
```

## Files

| File | Purpose |
|------|---------|
| `scripts/generate-test-fixtures.js` | Generates pre-computed fixtures |
| `scripts/validate-test-fixtures.js` | Validates fixture consistency |
| `src/tests/db-tests/fixtures/available-area-computed.json` | Pre-computed database results |
| `src/tests/db-tests/fixtures/availableAreaCalculationScenarios.csv` | Test scenarios (unchanged) |
| `src/tests/db-tests/setup/getAvailableAreaFixtures.js` | Fixture loading utilities |

## Usage

### Generating Fixtures

Run this when test scenarios change or land data is updated:

```bash
npm run test:fixtures:generate
```

This will:
1. Start test database with fresh land data
2. Run all database queries once
3. Store results in `available-area-computed.json`
4. Clean up test database

### Validating Fixtures

Check if fixtures are in sync with scenarios:

```bash
npm run test:fixtures:validate
```

This validates:
- All CSV scenarios have computed data
- Fixture structure is correct
- No stale/extra computed scenarios
- Compatibility matrix completeness

### Running Optimized Tests

The test automatically uses computed fixtures:

```bash
npm run test:db  # Includes optimized available area test
```

## When to Regenerate Fixtures

Regenerate fixtures when:

1. **Test scenarios change**: Adding/modifying `availableAreaCalculationScenarios.csv`
2. **Land data changes**: Updates to parcels, land covers, compatibility matrix
3. **Database schema changes**: Updates affecting land cover or compatibility queries
4. **Stale fixtures**: Validator warns fixtures are >30 days old

## Fixture Structure

```json
{
  "metadata": {
    "generatedAt": "2026-03-25T10:30:00.000Z",
    "actionCodes": ["CMOR1", "UPL1", ...],
    "scenarioCount": 14,
    "version": "1.0.0"
  },
  "compatibilityMatrix": {
    "CMOR1": {"CMOR1": true, "UPL1": false, ...},
    "UPL1": {"CMOR1": false, "UPL1": true, ...}
  },
  "scenarioData": {
    "CMOR1 - No existing actions": {
      "scenario": {...},
      "dataRequirements": {...}
    }
  }
}
```

## Development Workflow

1. **Add new test scenario**:
   - Update `availableAreaCalculationScenarios.csv`
   - Run `npm run test:fixtures:generate`
   - Commit both CSV and computed JSON files

2. **Update land data**:
   - Run `npm run test:fixtures:generate`
   - Validate with `npm run test:fixtures:validate`
   - Commit updated computed fixtures

3. **Debugging fixture issues**:
   - Check `npm run test:fixtures:validate` output
   - Review fixture generation logs
   - Compare original vs computed test results

## Performance Benefits

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| DB Queries | ~70 | 0 | 100% |
| Test Time | 30-60s | <2s | 95%+ |
| CI Time | High | Low | Significant |
| Dev Experience | Slow | Fast | Much better |

## Troubleshooting

**Error: "Computed fixtures not available"**
- Run `npm run test:fixtures:generate`

**Error: "Scenario count mismatch"**  
- CSV scenarios changed, regenerate fixtures
- Run `npm run test:fixtures:generate`

**Test failures after fixture generation**
- Check if land data or calculation logic changed
- Compare original test results with computed fixture results
- May indicate a genuine change requiring updated expectations

**Fixtures older than 30 days**
- Consider regenerating to ensure freshness
- Run `npm run test:fixtures:validate` to check

## Migration Notes

The original test file was preserved as reference. Key changes:

- **No database connection**: Test is now pure calculation
- **Pre-computed data**: All DB queries results stored in fixtures  
- **Same test scenarios**: CSV scenarios unchanged for compatibility
- **Same assertions**: Test expectations unchanged

This optimization maintains test validity while dramatically improving performance.