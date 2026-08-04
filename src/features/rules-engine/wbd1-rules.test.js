import { executeRules } from './rulesEngine.js'
import { rules } from './rules/index.js'

// Exercises WBD1's two configured rules together, using the exact rules[] array from
// grants-config-land-grants/configurations/land-grants/actions/WBD1/wbd1-1.0.0.json,
// against the real rule registry (not mocks) - hefer-consent-required is an existing,
// generic, config-driven rule that needs no code change to work for WBD1; the new
// manual-check-required rule (dispatched via pond-check-required's `type`) always
// attaches its caveat.

const WBD1_RULES = [
  {
    name: 'hefer-consent-required',
    config: {
      layerName: 'historic_features',
      tolerancePercent: 0,
      caveatDescription: 'A hefer is needed from Historic England'
    },
    description:
      'Does the site require a Historic Environment Farm Environment Record?'
  },
  {
    name: 'pond-check-required',
    type: 'manual-check-required',
    config: {
      caveatDescription: 'A manual pond check is required'
    },
    description: 'Manual check that the pond is not on SSSI land'
  }
]

const buildApplication = (intersectingAreaPercentage) => ({
  parcelId: '9215',
  sheetId: 'SD5649',
  actionCode: 'WBD1',
  landParcel: {
    intersections: {
      historic_features: {
        intersectingAreaPercentage,
        intersectionAreaHa: 0.05
      }
    }
  }
})

describe('WBD1 rules (hefer-consent-required + pond-check-required)', () => {
  test('always attaches the pond-check-required caveat, regardless of HEFER overlap', () => {
    const result = executeRules(rules, buildApplication(0), WBD1_RULES)

    const pondCheckResult = result.results.find(
      (r) => r.name === 'pond-check-required'
    )
    expect(pondCheckResult.passed).toBe(true)
    expect(pondCheckResult.caveat).toEqual({
      code: 'pond-check-required',
      description: 'A manual pond check is required',
      metadata: {
        actionCode: 'WBD1',
        parcelId: '9215',
        sheetId: 'SD5649'
      }
    })
  })

  test('hefer-consent-required attaches a caveat when overlap exceeds tolerance', () => {
    const result = executeRules(rules, buildApplication(5), WBD1_RULES)

    const heferResult = result.results.find(
      (r) => r.name === 'hefer-consent-required'
    )
    expect(heferResult.passed).toBe(true)
    expect(heferResult.caveat).toEqual({
      code: 'hefer-consent-required',
      description: 'A hefer is needed from Historic England',
      metadata: {
        actionCode: 'WBD1',
        parcelId: '9215',
        sheetId: 'SD5649',
        percentageOverlap: 5,
        overlapAreaHectares: 0.05
      }
    })
  })

  test('hefer-consent-required attaches no caveat when there is no overlap', () => {
    const result = executeRules(rules, buildApplication(0), WBD1_RULES)

    const heferResult = result.results.find(
      (r) => r.name === 'hefer-consent-required'
    )
    expect(heferResult.passed).toBe(true)
    expect(heferResult.caveat).toBeUndefined()
  })

  test('both rules pass overall, and both are represented in the results', () => {
    const result = executeRules(rules, buildApplication(5), WBD1_RULES)

    expect(result.passed).toBe(true)
    expect(result.results).toHaveLength(2)
    expect(result.results.map((r) => r.name)).toEqual([
      'hefer-consent-required',
      'pond-check-required'
    ])
  })
})
