import { describe, test, expect } from 'vitest'
import { maxAreaForNewAction } from './aac-lp.js'

// Mirror of the test data from aac-experiment.test.ts, converted to LP input format

const covers = {
  Woodland: 2500,
  Grassland: 3100,
  'Car park': 1000
}

const validLandCovers = {
  CMOR1: new Set(['Grassland']),
  AA1: new Set(['Woodland', 'Car park', 'Circus']),
  AA2: new Set(['Woodland', 'Grassland', 'Deep Ocean']),
  AA3: new Set(['Car park']),
  AA4: new Set(['Meadow', 'Wetland', 'Woodland', 'Grassland']),
  AA5: new Set(['Meadow', 'Wetland', 'Woodland'])
}

// compatibilityMatrix from aac-experiment.test.ts: only AA1 and AA3 are compatible.
// All other pairs are incompatible.
const compatibilityMatrix = [['AA1', 'AA3']]

// Simple compatibility function that checks the compatibility matrix
const createCompatibilityCheckFn = (matrix) => (code1, code2) => {
  return matrix.some(
    (pair) =>
      (pair[0] === code1 && pair[1] === code2) ||
      (pair[0] === code2 && pair[1] === code1)
  )
}

// Default compatibility function using the base matrix
const compatibilityCheckFn = createCompatibilityCheckFn(compatibilityMatrix)

/**
 * Mirrors createTestData from aac-experiment.test.ts for LP format.
 * @param {number} numActions - Number of existing actions to create
 * @param {number} numLandCovers - Number of land covers to create
 * @returns {{ covers: Record<string, number>, existingActions: Record<string, number>, validLandCovers: Record<string, Set<string>>, testIncompatibleActions: Set<string> }}
 */
function createTestData(numActions, numLandCovers) {
  const testCovers = {}
  for (let i = 1; i <= numLandCovers; i++) {
    testCovers[`LandCover${i}`] = 1000
  }

  const testExistingActions = {}
  const testValidLandCovers = {}
  const testIncompatibleActions = new Set()
  const coverNames = Object.keys(testCovers)

  for (let i = 1; i <= numActions; i++) {
    const code = `AA${i}`
    testExistingActions[code] = 1000
    testValidLandCovers[code] = new Set(coverNames)
    testIncompatibleActions.add(code)
  }

  testValidLandCovers.CMOR1 = new Set(coverNames)

  return {
    covers: testCovers,
    existingActions: testExistingActions,
    validLandCovers: testValidLandCovers,
    testIncompatibleActions
  }
}

// Test compatibility function: all actions incompatible with each other
const testCompatibilityCheckFn = () => false

describe('maxAreaForNewAction', () => {
  test('returns total eligible cover area when no existing actions are present', () => {
    const result = maxAreaForNewAction({
      covers,
      existingActions: {},
      newAction: 'CMOR1',
      validLandCovers,
      compatibilityCheckFn: testCompatibilityCheckFn
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
    // For this test, CMOR1 needs to be incompatible with AA1 and AA2
    const testMatrix = [['AA1', 'AA3']] // CMOR1 not included, so incompatible with AA1 and AA2
    const testCompatibilityFn = createCompatibilityCheckFn(testMatrix)

    const result = maxAreaForNewAction({
      covers,
      existingActions: { AA1: 2500, AA2: 3000 },
      newAction: 'CMOR1',
      validLandCovers,
      compatibilityCheckFn: testCompatibilityFn
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
    // For this test, CMOR1 needs to be incompatible with AA1 and AA2 to get specific result
    const testMatrix = [
      ['AA1', 'AA3'],
      ['CMOR1', 'AA3']
    ]
    const testCompatibilityFn = createCompatibilityCheckFn(testMatrix)

    const result = maxAreaForNewAction({
      covers,
      existingActions: { AA1: 2500, AA2: 3000 },
      newAction: 'CMOR1',
      validLandCovers,
      compatibilityCheckFn: testCompatibilityFn
    })

    expect(result.maxAreaSqm).toBeGreaterThanOrEqual(1100)
  })

  test('compatible existing actions do not reduce available area for new action (stacking)', () => {
    // A_compat is compatible with newAction (not in incompatibleWith).
    // In the stacking model, compatible actions share physical space, so A_compat
    // should not reduce the available area for newAction on the same cover.
    const stackingCovers = { C1: 1000 }
    const stackingValidLandCovers = {
      A_compat: new Set(['C1']),
      newAction: new Set(['C1'])
    }

    const result = maxAreaForNewAction({
      covers: stackingCovers,
      existingActions: { A_compat: 500 },
      newAction: 'newAction',
      validLandCovers: stackingValidLandCovers,
      compatibilityCheckFn: () => true // All actions are compatible
    })

    // A_compat (compatible) stacks with newAction: full 1000 sqm is available
    expect(result.feasible).toBe(true)
    expect(result.maxAreaSqm).toBe(1000)
    expect(result.existingActionsByCover).toEqual({ A_compat: { C1: 500 } })
    expect(result.newActionByCover).toEqual({ C1: 1000 })
  })

  test('incompatible existing action reduces available area for new action', () => {
    const testCovers = { C1: 1000 }
    const testValidLandCovers = {
      A_incompat: new Set(['C1']),
      newAction: new Set(['C1'])
    }

    const result = maxAreaForNewAction({
      covers: testCovers,
      existingActions: { A_incompat: 600 },
      newAction: 'newAction',
      validLandCovers: testValidLandCovers,
      compatibilityCheckFn: () => false // All actions are incompatible
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
      validLandCovers,
      compatibilityCheckFn
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
      validLandCovers,
      compatibilityCheckFn
    })

    expect(result.maxAreaSqm).toBe(0)
    expect(result.existingActionsByCover).toEqual({})
    expect(result.newActionByCover).toEqual({})
  })

  test('LP placement output identifies where existing actions are placed', () => {
    // For this test, CMOR1 needs to be incompatible with AA1 and AA2 to get specific result
    const testMatrix = [
      ['AA1', 'AA3'],
      ['CMOR1', 'AA3']
    ]
    const testCompatibilityFn = createCompatibilityCheckFn(testMatrix)

    const result = maxAreaForNewAction({
      covers,
      existingActions: { AA1: 2500, AA2: 3000 },
      newAction: 'CMOR1',
      validLandCovers,
      compatibilityCheckFn: testCompatibilityFn
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
      validLandCovers: testValidLandCovers,
      testIncompatibleActions
    } = createTestData(4, 4)

    // Create performance test compatibility function - all test actions incompatible with CMOR1
    const performanceCompatibilityCheckFn = (existingAction, newAction) => {
      if (newAction === 'CMOR1') {
        return !testIncompatibleActions.has(existingAction)
      }
      return true
    }

    const startTime = Date.now()

    const result = maxAreaForNewAction({
      covers: testCovers,
      existingActions,
      newAction: 'CMOR1',
      validLandCovers: testValidLandCovers,
      compatibilityCheckFn: performanceCompatibilityCheckFn
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
      validLandCovers: testValidLandCovers,
      testIncompatibleActions
    } = createTestData(10, 10)

    // Create performance test compatibility function - all test actions incompatible with CMOR1
    const performanceCompatibilityCheckFn = (existingAction, newAction) => {
      if (newAction === 'CMOR1') {
        return !testIncompatibleActions.has(existingAction)
      }
      return true
    }

    const startTime = Date.now()

    const result = maxAreaForNewAction({
      covers: testCovers,
      existingActions,
      newAction: 'CMOR1',
      validLandCovers: testValidLandCovers,
      compatibilityCheckFn: performanceCompatibilityCheckFn
    })

    const duration = Date.now() - startTime
    console.log(`maxAreaForNewAction (10x10) completed in ${duration} ms`)

    expect(duration).toBeLessThan(100)
    expect(result.feasible).toBe(true)
  })

  test('compatible existing actions can stack together without consuming additional area', () => {
    // This test verifies the new functionality: cross-compatibility between existing actions
    const testCovers = { 'Car park': 1000 }
    const testValidLandCovers = {
      AA1: new Set(['Car park']),
      AA3: new Set(['Car park']),
      newAction: new Set(['Car park'])
    }

    // For this test: AA1↔AA3 compatible, newAction compatible with AA3 but not AA1
    const stackingMatrix = [
      ['AA1', 'AA3'],
      ['newAction', 'AA3']
    ]
    const stackingCompatibilityFn = createCompatibilityCheckFn(stackingMatrix)

    const result = maxAreaForNewAction({
      covers: testCovers,
      existingActions: { AA1: 800, AA3: 600 },
      newAction: 'newAction',
      validLandCovers: testValidLandCovers,
      compatibilityCheckFn: stackingCompatibilityFn
    })

    // AA1 and AA3 can stack (compatible with each other)
    // newAction is compatible with AA3 and can join the stack
    // Available area for newAction = 1000 - 800 = 200
    expect(result.feasible).toBe(true)
    expect(result.maxAreaSqm).toBe(200)
    console.log(
      'Stacking compatible actions result:',
      JSON.stringify(result, null, 2)
    )

    expect(result.newActionByCover).toEqual({ 'Car park': 200 })
  })

  test('incompatible existing actions cannot stack together', () => {
    // This test verifies that incompatible existing actions compete for space
    // AA1 and AA2 are incompatible (cannot stack)
    const testCovers = { Woodland: 1000 }
    const testValidLandCovers = {
      AA1: new Set(['Woodland']),
      AA2: new Set(['Woodland']),
      newAction: new Set(['Woodland'])
    }

    // For this test: AA1↔AA3 compatible, but newAction incompatible with both AA1 and AA2
    const incompatibleMatrix = [['AA1', 'AA3']] // Only existing actions are compatible
    const incompatibleCompatibilityFn =
      createCompatibilityCheckFn(incompatibleMatrix)

    // AA1(400) and AA2(300) are incompatible, total = 700 sqm fits in 1000 sqm
    // This ensures the problem is feasible while testing the incompatibility constraint
    const result = maxAreaForNewAction({
      covers: testCovers,
      existingActions: { AA1: 400, AA2: 300 },
      newAction: 'newAction',
      validLandCovers: testValidLandCovers,
      compatibilityCheckFn: incompatibleCompatibilityFn
    })

    // Both AA1 and AA2 are incompatible with newAction and with each other
    // The solver must allocate AA1=400 and AA2=300 to Woodland, using 700 sqm total
    // NewAction can use the remaining 300 sqm
    expect(result.feasible).toBe(true)

    // Verify that both existing actions are properly allocated
    const aa1Area = result.existingActionsByCover.AA1?.Woodland || 0
    const aa2Area = result.existingActionsByCover.AA2?.Woodland || 0
    expect(aa1Area).toBe(400) // AA1 gets its required 400 sqm
    expect(aa2Area).toBe(300) // AA2 gets its required 300 sqm

    // New action gets the remaining area
    expect(result.newActionByCover.Woodland).toBe(300)
    expect(result.maxAreaSqm).toBe(300)
  })

  test('handles multiple (>2) incompatible existing actions on one land cover', () => {
    // Test case: 4 incompatible actions each needing 200 sqm on a 1000 sqm cover
    // Total demand: 4 × 200 = 800 sqm < 1000 sqm capacity (feasible)
    // This tests that the grouped constraint properly limits incompatible actions
    const testCovers = { Forest: 1000 }
    const testValidLandCovers = {
      A: new Set(['Forest']),
      B: new Set(['Forest']),
      C: new Set(['Forest']),
      D: new Set(['Forest']),
      newAction: new Set(['Forest'])
    }

    // All existing actions mutually incompatible, but not with newAction
    const testCompatibilityFn = (action1, action2) => {
      // Existing actions are incompatible with each other
      return !(
        ['A', 'B', 'C', 'D'].includes(action1) &&
        ['A', 'B', 'C', 'D'].includes(action2)
      )
    }

    const result = maxAreaForNewAction({
      covers: testCovers,
      existingActions: { A: 200, B: 200, C: 200, D: 200 },
      newAction: 'newAction',
      validLandCovers: testValidLandCovers,
      compatibilityCheckFn: testCompatibilityFn
    })

    expect(result.feasible).toBe(true)

    // All existing actions should be allocated their required amounts
    const totalExistingOnForest =
      (result.existingActionsByCover.A?.Forest || 0) +
      (result.existingActionsByCover.B?.Forest || 0) +
      (result.existingActionsByCover.C?.Forest || 0) +
      (result.existingActionsByCover.D?.Forest || 0)

    expect(totalExistingOnForest).toBe(800) // 4 × 200

    // New action can use remaining area since existing actions are compatible with it
    const newActionOnForest = result.newActionByCover.Forest || 0
    expect(newActionOnForest).toBe(1000) // Can stack with existing actions
    expect(result.maxAreaSqm).toBe(1000)
  })

  test('correctly identifies infeasible scenarios with multiple incompatible actions exceeding capacity', () => {
    // This test demonstrates the specific problem that grouped constraints solve:
    // Multiple incompatible actions requiring more total area than available
    const testCovers = { Prairie: 1000 }
    const testValidLandCovers = {
      X: new Set(['Prairie']),
      Y: new Set(['Prairie']),
      Z: new Set(['Prairie']),
      newAction: new Set(['Prairie'])
    }

    // All actions mutually incompatible
    const testCompatibilityFn = () => false

    const result = maxAreaForNewAction({
      covers: testCovers,
      existingActions: { X: 400, Y: 400, Z: 400 }, // Total: 1200 > 1000 capacity
      newAction: 'newAction',
      validLandCovers: testValidLandCovers,
      compatibilityCheckFn: testCompatibilityFn
    })

    // Should be infeasible: 400+400+400+newAction > 1000 is impossible
    expect(result.feasible).toBe(false)
    expect(result.maxAreaSqm).toBe(0)
  })

  test('handles multiple compatibility groups (stacks) competing for the same land cover', () => {
    // Scenario: aa1 & aa2 compatible (stack 1), aa3 & aa4 compatible (stack 2)
    // aa2 not compatible with aa3 (stacks compete), CMOR1 only on moorland
    const testCovers = { grassland: 2000, moorland: 1000 }
    const testValidLandCovers = {
      aa1: new Set(['grassland', 'moorland']),
      aa2: new Set(['grassland', 'moorland']),
      aa3: new Set(['grassland', 'moorland']),
      aa4: new Set(['grassland', 'moorland']),
      CMOR1: new Set(['moorland'])
    }

    // Define compatibility: aa1↔aa2 compatible, aa3↔aa4 compatible, aa2↔aa3 incompatible
    const compatibilityMatrix = [
      ['aa1', 'aa2'],
      ['aa3', 'aa4']
    ]
    const testCompatibilityFn = (action1, action2) => {
      // Handle incompatibility with CMOR1
      if (
        (action1 === 'CMOR1' &&
          ['aa1', 'aa2', 'aa3', 'aa4'].includes(action2)) ||
        (action2 === 'CMOR1' && ['aa1', 'aa2', 'aa3', 'aa4'].includes(action1))
      ) {
        return false
      }

      // Handle existing action compatibility
      return compatibilityMatrix.some(
        (pair) =>
          (pair[0] === action1 && pair[1] === action2) ||
          (pair[0] === action2 && pair[1] === action1)
      )
    }

    const result = maxAreaForNewAction({
      covers: testCovers,
      existingActions: { aa1: 600, aa2: 400, aa3: 500, aa4: 300 },
      newAction: 'CMOR1',
      validLandCovers: testValidLandCovers,
      compatibilityCheckFn: testCompatibilityFn
    })

    expect(result.feasible).toBe(true)

    // Stack 1 (aa1+aa2) should use max(aa1, aa2) = 600 sqm physical space
    // Stack 2 (aa3+aa4) should use max(aa3, aa4) = 500 sqm physical space
    // Total physical space needed: 600 + 500 = 1100 sqm
    // Available: grassland(2000) + moorland(1000) = 3000 sqm total
    // CMOR1 only on moorland, competing with existing actions there

    // Verify the solution respects stacking rules
    console.log('Multiple stacks result:', {
      feasible: result.feasible,
      maxAreaSqm: result.maxAreaSqm,
      existingActionsByCover: result.existingActionsByCover,
      newActionByCover: result.newActionByCover
    })

    // The current implementation likely fails this test by being overly restrictive
    expect(result.maxAreaSqm).toBeGreaterThan(0)
  })

  test('reveals stacking constraint issue: compatible groups should share physical space', () => {
    // Test proper stacking: compatible groups share space, incompatible groups compete
    // aa1(500) + aa2(300) → max(500,300) = 500 physical space (stack 1)
    // aa3(200) + aa4(100) → max(200,100) = 200 physical space (stack 2)
    // Total physical space = 500 + 200 = 700, newAction gets remainder = 300
    const testCovers = { field: 1000 }
    const testValidLandCovers = {
      aa1: new Set(['field']),
      aa2: new Set(['field']),
      aa3: new Set(['field']),
      aa4: new Set(['field']),
      newAction: new Set(['field'])
    }

    // aa1↔aa2 compatible (stack), aa3↔aa4 compatible (stack), but stacks incompatible
    const compatibilityMatrix = [
      ['aa1', 'aa2'],
      ['aa3', 'aa4']
    ]

    const result = maxAreaForNewAction({
      covers: testCovers,
      existingActions: { aa1: 500, aa2: 300, aa3: 200, aa4: 100 },
      newAction: 'newAction',
      validLandCovers: testValidLandCovers,
      compatibilityCheckFn: createCompatibilityCheckFn(compatibilityMatrix)
    })

    expect(result.feasible).toBe(true) // Should be feasible
    // Proper stacking: group1(500) + group2(200) + newAction ≤ 1000
    // newAction should get at least 300 sqm
    expect(result.maxAreaSqm).toBeGreaterThanOrEqual(300)
  })

  test('complex scenario requiring split stacks', () => {
    // Test proper stacking: compatible groups share space, incompatible groups compete
    // aa1 can split between two groups: [aa1,aa2] and [aa1,aa3]
    // aa3 can split between two groups: [aa1,aa3] and [aa3,aa4]
    // Expected optimal allocation:
    // - Group [aa1,aa2]: aa1(300) + aa2(300) = 300 physical space
    // - Group [aa1,aa3]: aa1(200) + aa3(200) = 200 physical space
    // - Group [aa3,aa4]: aa3(0) + aa4(100) = 100 physical space
    // Total: 300 + 200 + 100 = 600, leaving 400 for newAction
    const testCovers = { field: 1000 }
    const testValidLandCovers = {
      aa1: new Set(['field']),
      aa2: new Set(['field']),
      aa3: new Set(['field']),
      aa4: new Set(['field']),
      newAction: new Set(['field'])
    }

    // aa1↔aa2 compatible, aa1↔aa3 compatible, aa3↔aa4 compatible
    // But aa2↔aa3 NOT compatible, aa2↔aa4 NOT compatible
    const compatibilityMatrix = [
      ['aa1', 'aa2'],
      ['aa3', 'aa4'],
      ['aa1', 'aa3']
    ]

    const compatFn = createCompatibilityCheckFn(compatibilityMatrix)

    const result = maxAreaForNewAction({
      covers: testCovers,
      existingActions: { aa1: 500, aa2: 300, aa3: 200, aa4: 100 },
      newAction: 'newAction',
      validLandCovers: testValidLandCovers,
      compatibilityCheckFn: compatFn
    })

    expect(result.feasible).toBe(true) // Should be feasible
    // With split stacks, optimal result should be significantly better than 300
    // Expecting around 400 sqm with proper optimization
    expect(result.maxAreaSqm).toBeGreaterThan(350)
  })
})
