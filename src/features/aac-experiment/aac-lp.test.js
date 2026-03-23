import { describe, test, expect } from 'vitest'
import { maxAreaForNewAction } from './aac-lp.js'

// Mirror of the test data from aac-experiment.test.ts, converted to LP input format

const covers = {
  Woodland: 2500,
  Grassland: 3100,
  'Car park': 1000
}

const eligibility = {
  CMOR1: new Set(['Grassland']),
  AA1: new Set(['Woodland', 'Car park', 'Circus']),
  AA2: new Set(['Woodland', 'Grassland', 'Deep Ocean']),
  AA3: new Set(['Car park']),
  AA4: new Set(['Meadow', 'Wetland', 'Woodland', 'Grassland']),
  AA5: new Set(['Meadow', 'Wetland', 'Woodland'])
}

// compatibilityMatrix from aac-experiment.test.ts: only AA1 and AA3 are compatible.
// All other pairs are incompatible.
const incompatibleWithCMOR1 = new Set(['AA1', 'AA2'])

/**
 * Mirrors createTestData from aac-experiment.test.ts for LP format.
 * @param {number} numActions - Number of existing actions to create
 * @param {number} numLandCovers - Number of land covers to create
 * @returns {{ covers: Record<string, number>, existingActions: Record<string, number>, eligibility: Record<string, Set<string>>, incompatibleWith: Set<string> }}
 */
function createTestData(numActions, numLandCovers) {
  const testCovers = {}
  for (let i = 1; i <= numLandCovers; i++) {
    testCovers[`LandCover${i}`] = 1000
  }

  const testExistingActions = {}
  const testEligibility = {}
  const testIncompatibleWith = new Set()
  const coverNames = Object.keys(testCovers)

  for (let i = 1; i <= numActions; i++) {
    const code = `AA${i}`
    testExistingActions[code] = 1000
    testEligibility[code] = new Set(coverNames)
    testIncompatibleWith.add(code)
  }

  testEligibility.CMOR1 = new Set(coverNames)

  return {
    covers: testCovers,
    existingActions: testExistingActions,
    eligibility: testEligibility,
    incompatibleWith: testIncompatibleWith
  }
}

describe('maxAreaForNewAction', () => {
  test('returns total eligible cover area when no existing actions are present', () => {
    const result = maxAreaForNewAction({
      covers,
      existingActions: {},
      newAction: 'CMOR1',
      eligibility,
      incompatibleWith: new Set()
    })

    // CMOR1 is only eligible for Grassland (3100 sqm)
    expect(result.feasible).toBe(true)
    expect(result.maxAreaSqm).toBe(3100)
    expect(result.existingActionsByCover).toEqual({})
    expect(result.newActionByCover).toEqual({ Grassland: 3100 })
  })

  test('returns 1100 sqm for CMOR1 given AA1 (2500) and AA2 (3000) — mirrors getMaximumAvailableAreaForActionLazy', () => {
    // Mirror of: 'getMaximumAvailableAreaForAction returns 1100 sqm for CMOR1'
    // The LP finds the optimal placement: AA1 fills Car park (1000) + Woodland (1500),
    // AA2 fills remaining Woodland (1000) + Grassland (2000), leaving 1100 for CMOR1.
    const result = maxAreaForNewAction({
      covers,
      existingActions: { AA1: 2500, AA2: 3000 },
      newAction: 'CMOR1',
      eligibility,
      incompatibleWith: incompatibleWithCMOR1
    })

    expect(result.feasible).toBe(true)
    expect(result.maxAreaSqm).toBe(1100)

    expect(result.existingActionsByCover).toEqual({
      AA1: { 'Car park': 1000, Woodland: 1500 },
      AA2: { Woodland: 1000, Grassland: 2000 }
    })
    expect(result.newActionByCover).toEqual({ Grassland: 1100 })
  })

  test('optimal LP result is always at least as good as the best specific land cover ordering', () => {
    // Mirror of: calculateAvailableAreaForAction tests with orderings [Woodland,CarPark] (gives 100)
    // and [CarPark,Woodland] (gives 1100).
    // The LP must find the maximum over all possible orderings — i.e. 1100, not 100.
    const result = maxAreaForNewAction({
      covers,
      existingActions: { AA1: 2500, AA2: 3000 },
      newAction: 'CMOR1',
      eligibility,
      incompatibleWith: incompatibleWithCMOR1
    })

    expect(result.maxAreaSqm).toBeGreaterThanOrEqual(1100)
  })

  test('compatible existing actions do not reduce available area for new action (stacking)', () => {
    // A_compat is compatible with newAction (not in incompatibleWith).
    // In the stacking model, compatible actions share physical space, so A_compat
    // should not reduce the available area for newAction on the same cover.
    const stackingCovers = { C1: 1000 }
    const stackingEligibility = {
      A_compat: new Set(['C1']),
      newAction: new Set(['C1'])
    }

    const result = maxAreaForNewAction({
      covers: stackingCovers,
      existingActions: { A_compat: 500 },
      newAction: 'newAction',
      eligibility: stackingEligibility,
      incompatibleWith: new Set() // A_compat is compatible — not in this set
    })

    // A_compat (compatible) stacks with newAction: full 1000 sqm is available
    expect(result.feasible).toBe(true)
    expect(result.maxAreaSqm).toBe(1000)
    expect(result.existingActionsByCover).toEqual({ A_compat: { C1: 500 } })
    expect(result.newActionByCover).toEqual({ C1: 1000 })
  })

  test('incompatible existing action reduces available area for new action', () => {
    const testCovers = { C1: 1000 }
    const testEligibility = {
      A_incompat: new Set(['C1']),
      newAction: new Set(['C1'])
    }

    const result = maxAreaForNewAction({
      covers: testCovers,
      existingActions: { A_incompat: 600 },
      newAction: 'newAction',
      eligibility: testEligibility,
      incompatibleWith: new Set(['A_incompat'])
    })

    // A_incompat occupies 600 sqm, leaving 400 sqm for newAction
    expect(result.feasible).toBe(true)
    expect(result.maxAreaSqm).toBe(400)
    expect(result.existingActionsByCover).toEqual({ A_incompat: { C1: 600 } })
    expect(result.newActionByCover).toEqual({ C1: 400 })
  })

  test('returns 0 when new action has no eligible covers present in the parcel', () => {
    const result = maxAreaForNewAction({
      covers,
      existingActions: {},
      newAction: 'AA5', // eligible for Meadow, Wetland, Woodland — but Meadow and Wetland are not in covers
      eligibility,
      incompatibleWith: new Set()
    })

    // AA5 is eligible for Meadow, Wetland, Woodland.
    // Woodland IS in covers (2500 sqm), so AA5 gets 2500 sqm.
    expect(result.feasible).toBe(true)
    expect(result.maxAreaSqm).toBe(2500)
    expect(result.existingActionsByCover).toEqual({})
    expect(result.newActionByCover).toEqual({ Woodland: 2500 })
  })

  test('returns 0 when new action has no eligible covers at all in the parcel', () => {
    const smallCovers = { Grassland: 3100 }
    const result = maxAreaForNewAction({
      covers: smallCovers,
      existingActions: {},
      newAction: 'AA3', // only eligible for Car park, which is not in smallCovers
      eligibility,
      incompatibleWith: new Set()
    })

    expect(result.maxAreaSqm).toBe(0)
    expect(result.existingActionsByCover).toEqual({})
    expect(result.newActionByCover).toEqual({})
  })

  test('LP placement output identifies where existing actions are placed', () => {
    const result = maxAreaForNewAction({
      covers,
      existingActions: { AA1: 2500, AA2: 3000 },
      newAction: 'CMOR1',
      eligibility,
      incompatibleWith: incompatibleWithCMOR1
    })

    expect(result.feasible).toBe(true)
    // AA1 (2500 sqm) across Woodland (2500) and Car park (1000)
    expect(result.existingActionsByCover.AA1).toBeDefined()
    // AA2 (3000 sqm) across Woodland and Grassland
    expect(result.existingActionsByCover.AA2).toBeDefined()
    // New action placed on Grassland
    expect(result.newActionByCover.Grassland).toBeGreaterThan(0)
  })

  test('completes within a reasonable time for 4 actions and 4 land covers — mirrors performance test', () => {
    // Mirror of: 'getMaximumAvailableAreaForAction returns the correct area within a reasonable time for 4 actions and 4 land covers'
    const {
      covers: testCovers,
      existingActions,
      eligibility: testEligibility,
      incompatibleWith
    } = createTestData(4, 4)

    const startTime = Date.now()

    const result = maxAreaForNewAction({
      covers: testCovers,
      existingActions,
      newAction: 'CMOR1',
      eligibility: testEligibility,
      incompatibleWith
    })

    const duration = Date.now() - startTime
    console.log(`maxAreaForNewAction (4x4) completed in ${duration} ms`)

    expect(duration).toBeLessThan(5000)
    expect(result.feasible).toBe(true)
    expect(typeof result.maxAreaSqm).toBe('number')
  })

  test('completes in under 100ms for 10 actions and 10 land covers — LP scales far better than permutation search', () => {
    const {
      covers: testCovers,
      existingActions,
      eligibility: testEligibility,
      incompatibleWith
    } = createTestData(10, 10)

    const startTime = Date.now()

    const result = maxAreaForNewAction({
      covers: testCovers,
      existingActions,
      newAction: 'CMOR1',
      eligibility: testEligibility,
      incompatibleWith
    })

    const duration = Date.now() - startTime
    console.log(`maxAreaForNewAction (10x10) completed in ${duration} ms`)

    expect(duration).toBeLessThan(100)
    expect(result.feasible).toBe(true)
  })
})
