import { expect, describe, test } from 'vitest'
import {
  getLandCoverPermutationsForActionLazy,
  getLandCoverPermutationsForActionOptimizedLazy,
  createAllActionLandCoverPermutationsLazy,
  calculateAvailableAreaForAction,
  calculateTotalCompatibleLandCoverArea,
  getCompatibleLandCoversWithAreas,
  getMaximumAvailableAreaForActionLazy,
  createActionStacks
} from './aac-experiment.ts'
import {
  LandCover,
  Action,
  LandCoverOrderPerAction,
  LandCoversForActions,
  CompatibilityMatrix,
  CompatibilityCheckFn
} from './aac-experiment.types.ts'

export const landCoversForActions: LandCoversForActions = {
  CMOR1: ['Grassland'],
  AA1: ['Woodland', 'Car park', 'Circus'],
  AA2: ['Woodland', 'Grassland', 'Deep Ocean'],
  AA3: ['Car park'],
  AA4: ['Meadow', 'Wetland', 'Woodland', 'Grassland'], // Action with multiple shared and non-shared land covers
  AA5: ['Meadow', 'Wetland', 'Woodland']
}

export const landCoversOnParcel: LandCover[] = [
  { areaSqm: 2500, name: 'Woodland' },
  { areaSqm: 3100, name: 'Grassland' },
  { areaSqm: 1000, name: 'Car park' }
]

export const existingActions: Action[] = [
  { code: 'AA1', areaSqm: 2500 },
  { code: 'AA2', areaSqm: 3000 }
]

// no action codes are compatible
export const compatibilityMatrix: CompatibilityMatrix = [['AA1', 'AA3']]

export const compatibilityCheckFn: CompatibilityCheckFn = (
  code1: string,
  code2: string
): boolean => {
  return compatibilityMatrix.some(
    (pair: string[]) =>
      (pair[0] === code1 && pair[1] === code2) ||
      (pair[0] === code2 && pair[1] === code1)
  )
}

// Test data helper function
export function createTestData(numActions: number, numLandCovers: number) {
  const lotsOfActions: Action[] = []
  for (let i = 1; i <= numActions; i++) {
    lotsOfActions.push({ code: `AA${i}`, areaSqm: 1000 })
  }

  const lotsOfLandCovers: LandCover[] = []
  for (let i = 1; i <= numLandCovers; i++) {
    lotsOfLandCovers.push({ name: `LandCover${i}`, areaSqm: 1000 })
  }

  const landCoversForLotsOfActions: LandCoversForActions = {}
  lotsOfActions.forEach((action: Action) => {
    landCoversForLotsOfActions[action.code] = lotsOfLandCovers.map(
      (cover: LandCover) => cover.name
    )
  })

  return { lotsOfActions, lotsOfLandCovers, landCoversForLotsOfActions }
}

describe('lazy evaluation with generatorics', () => {
  test('getLandCoverPermutationsForActionLazy returns a generator', () => {
    const permutationsGenerator = getLandCoverPermutationsForActionLazy(
      'AA1',
      landCoversOnParcel,
      landCoversForActions
    )

    // Should be a generator object
    expect(typeof permutationsGenerator.next).toBe('function')
    expect(typeof permutationsGenerator[Symbol.iterator]).toBe('function')
  })

  test('lazy permutations yield same results as original permutations', () => {
    const originalPermutations = Array.from(
      getLandCoverPermutationsForActionLazy(
        'AA1',
        landCoversOnParcel,
        landCoversForActions
      )
    )

    const lazyPermutations = getLandCoverPermutationsForActionLazy(
      'AA1',
      landCoversOnParcel,
      landCoversForActions
    )

    const lazyResults = Array.from(lazyPermutations)

    // Compare content regardless of order
    expect(lazyResults).toHaveLength(originalPermutations.length)

    // Convert to sets of JSON strings for order-independent comparison
    const originalSet = new Set(
      originalPermutations.map((p) => JSON.stringify(p))
    )
    const lazySet = new Set(lazyResults.map((p) => JSON.stringify(p)))

    expect(lazySet).toEqual(originalSet)
  })

  test('lazy evaluation is memory efficient for large datasets', () => {
    const { lotsOfActions, lotsOfLandCovers, landCoversForLotsOfActions } =
      createTestData(6, 6) // Large enough to test memory efficiency - 6!^6 = 720^6 combinations

    // This should not cause memory issues even though it could generate many permutations
    const lazyCartesian = createAllActionLandCoverPermutationsLazy(
      lotsOfActions,
      lotsOfLandCovers,
      landCoversForLotsOfActions
    )

    // Take only first few results to test that generator works
    const firstFiveResults = [] as LandCoverOrderPerAction[]
    let count = 0
    for (const result of lazyCartesian) {
      firstFiveResults.push(result)
      count++
      if (count >= 5) break
    }

    expect(firstFiveResults).toHaveLength(5)
    // Each result should have the expected structure for 6 actions
    firstFiveResults.forEach((result) => {
      expect(Object.keys(result)).toEqual([
        'AA1',
        'AA2',
        'AA3',
        'AA4',
        'AA5',
        'AA6'
      ])
      expect(Array.isArray(result.AA1)).toBe(true)
      expect(Array.isArray(result.AA2)).toBe(true)
      expect(Array.isArray(result.AA3)).toBe(true)
      expect(Array.isArray(result.AA4)).toBe(true)
      expect(Array.isArray(result.AA5)).toBe(true)
      expect(Array.isArray(result.AA6)).toBe(true)
    })
  })
})

describe('testing ideas for aac', () => {
  test('can make cartesian product', () => {
    const permutations = Array.from(
      getLandCoverPermutationsForActionLazy(
        'AA1',
        landCoversOnParcel,
        landCoversForActions
      )
    )
    expect(permutations).toEqual([
      ['Woodland', 'Car park'],
      ['Car park', 'Woodland']
    ])
  })

  test('createAllActionLandCoverPermutations generates cartesian product', () => {
    const result = Array.from(
      createAllActionLandCoverPermutationsLazy(
        existingActions,
        landCoversOnParcel,
        landCoversForActions
      )
    )

    expect(result).toEqual([
      {
        AA1: ['Woodland', 'Car park'],
        AA2: ['Woodland', 'Grassland']
      },
      {
        AA1: ['Woodland', 'Car park'],
        AA2: ['Grassland', 'Woodland']
      },
      {
        AA1: ['Car park', 'Woodland'],
        AA2: ['Woodland', 'Grassland']
      },
      {
        AA1: ['Car park', 'Woodland'],
        AA2: ['Grassland', 'Woodland']
      }
    ])
  })

  test('getMaximumAvailableAreaForAction returns the correct area within a reasonable time for 4 actions and 4 land covers', () => {
    const { lotsOfActions, lotsOfLandCovers, landCoversForLotsOfActions } =
      createTestData(4, 4)

    // Add CMOR1 mapping for the test
    landCoversForLotsOfActions.CMOR1 = lotsOfLandCovers.map(
      (cover: LandCover) => cover.name
    )

    // time the function to ensure it completes within a reasonable time frame (e.g. 5 seconds)
    const startTime = Date.now()

    const result = getMaximumAvailableAreaForActionLazy(
      'CMOR1',
      lotsOfActions,
      lotsOfLandCovers,
      landCoversForLotsOfActions,
      compatibilityCheckFn
    )
    const endTime = Date.now()
    const duration = endTime - startTime
    console.log(`getMaximumAvailableAreaForAction completed in ${duration} ms`)
    expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    expect(result).toBeDefined()
    expect(typeof result).toBe('number')
  })

  test('createActionStacks creates stacks in order of land cover preference- [Woodland, Car park] for AA1', () => {
    const landCoverOrderPerAction: LandCoverOrderPerAction = {
      AA1: ['Woodland', 'Car park'],
      AA2: ['Woodland', 'Grassland']
    }
    const result = createActionStacks(
      existingActions,
      landCoversOnParcel,
      landCoverOrderPerAction,
      compatibilityCheckFn
    )

    expect(result).toEqual([
      {
        stackNumber: 1,
        areaSqm: 2500,
        actions: ['AA1'],
        landCover: 'Woodland'
      },
      {
        stackNumber: 2,
        areaSqm: 3000,
        actions: ['AA2'],
        landCover: 'Grassland'
      }
    ])
  })

  test('createActionStacks creates stacks in order of land cover preference- [Car park, Woodland] for AA1', () => {
    const landCoverOrderPerAction: LandCoverOrderPerAction = {
      AA1: ['Car park', 'Woodland'],
      AA2: ['Woodland', 'Grassland']
    }
    const result = createActionStacks(
      existingActions,
      landCoversOnParcel,
      landCoverOrderPerAction,
      compatibilityCheckFn
    )

    expect(result).toEqual([
      {
        stackNumber: 1,
        areaSqm: 1000,
        actions: ['AA1'],
        landCover: 'Car park'
      },
      {
        stackNumber: 2,
        areaSqm: 1500,
        actions: ['AA1'],
        landCover: 'Woodland'
      },
      {
        stackNumber: 3,
        areaSqm: 1000,
        actions: ['AA2'],
        landCover: 'Woodland'
      },
      {
        stackNumber: 4,
        areaSqm: 2000,
        actions: ['AA2'],
        landCover: 'Grassland'
      }
    ])
  })

  test('createActionStacks creates stacks in order of land cover preference- [Car park, Woodland] for AA1 and add AA2 to same stack if compatible', () => {
    const landCoverOrderPerAction: LandCoverOrderPerAction = {
      AA1: ['Car park', 'Woodland'],
      AA2: ['Woodland', 'Grassland'],
      AA3: ['Car park']
    }

    const existingActionForThisTest: Action[] = [
      { code: 'AA1', areaSqm: 2500 },
      { code: 'AA2', areaSqm: 3000 },
      { code: 'AA3', areaSqm: 1000 }
    ]

    const result = createActionStacks(
      existingActionForThisTest,
      landCoversOnParcel,
      landCoverOrderPerAction,
      compatibilityCheckFn
    )

    expect(result).toEqual([
      {
        stackNumber: 1,
        areaSqm: 1000,
        actions: ['AA1', 'AA3'],
        landCover: 'Car park'
      },
      {
        stackNumber: 2,
        areaSqm: 1500,
        actions: ['AA1'],
        landCover: 'Woodland'
      },
      {
        stackNumber: 3,
        areaSqm: 1000,
        actions: ['AA2'],
        landCover: 'Woodland'
      },
      {
        stackNumber: 4,
        areaSqm: 2000,
        actions: ['AA2'],
        landCover: 'Grassland'
      }
    ])
  })

  test('calculateAvailableAreaForAction returns 100 sqm for CMOR1 with land cover preference [Woodland, Car park] for AA1', () => {
    const landCoverOrderPerAction: LandCoverOrderPerAction = {
      AA1: ['Woodland', 'Car park'],
      AA2: ['Woodland', 'Grassland']
    }
    const totalCompatibleArea = calculateTotalCompatibleLandCoverArea(
      'CMOR1',
      landCoversOnParcel,
      landCoversForActions
    )
    const compatibleLandCovers = getCompatibleLandCoversWithAreas(
      'CMOR1',
      landCoversOnParcel,
      landCoversForActions
    )
    const result = calculateAvailableAreaForAction(
      'CMOR1',
      totalCompatibleArea,
      compatibleLandCovers,
      existingActions,
      landCoversOnParcel,
      landCoverOrderPerAction,
      compatibilityCheckFn
    )

    expect(result).toBe(100) // Grassland has 3100 sqm, AA2 takes 3000 of that, leaving 100 available for CMOR1
  })

  test('calculateAvailableAreaForAction returns 1100 sqm for CMOR1 with land cover preference [Car park, Woodland] for AA1', () => {
    const landCoverOrderPerAction: LandCoverOrderPerAction = {
      AA1: ['Car park', 'Woodland'],
      AA2: ['Woodland', 'Grassland']
    }
    const totalCompatibleArea = calculateTotalCompatibleLandCoverArea(
      'CMOR1',
      landCoversOnParcel,
      landCoversForActions
    )
    const compatibleLandCovers = getCompatibleLandCoversWithAreas(
      'CMOR1',
      landCoversOnParcel,
      landCoversForActions
    )
    const result = calculateAvailableAreaForAction(
      'CMOR1',
      totalCompatibleArea,
      compatibleLandCovers,
      existingActions,
      landCoversOnParcel,
      landCoverOrderPerAction,
      compatibilityCheckFn
    )

    expect(result).toBe(1100) // AA1 uses Car park (1000) + Woodland (1500), AA2 uses remaining Woodland (1000) + Grassland (2000), leaving 1100 for CMOR1 on Grassland
  })

  test('calculateAvailableAreaForAction adds up valid land covers for CMOR1', () => {
    const totalCompatibleArea = calculateTotalCompatibleLandCoverArea(
      'CMOR1',
      landCoversOnParcel,
      landCoversForActions
    )
    const compatibleLandCovers = getCompatibleLandCoversWithAreas(
      'CMOR1',
      landCoversOnParcel,
      landCoversForActions
    )
    const result = calculateAvailableAreaForAction(
      'CMOR1',
      totalCompatibleArea,
      compatibleLandCovers,
      [],
      landCoversOnParcel,
      {},
      () => true
    )

    expect(result).toBe(3100) // Grassland has 3100 sqm
  })

  test('getMaximumAvailableAreaForAction returns 1100 sqm for CMOR1', () => {
    const result = getMaximumAvailableAreaForActionLazy(
      'CMOR1',
      existingActions,
      landCoversOnParcel,
      landCoversForActions,
      compatibilityCheckFn
    )

    expect(result).toBe(1100) // The maximum available area for CMOR1 is 1100 sqm on Grassland when AA1 prefers Car park first
  })

  test('optimized permutations put shared land covers at end to maximize available area', () => {
    // Test scenario: CMOR1 needs Grassland, AA2 can use both Woodland and Grassland
    // If AA2's permutation puts Grassland at the end, more Grassland remains for CMOR1

    const testActions: Action[] = [
      { code: 'AA2', areaSqm: 2000 } // AA2 needs 2000 sqm
    ]

    const testLandCovers: LandCover[] = [
      { areaSqm: 1500, name: 'Woodland' }, // Not enough for AA2 alone
      { areaSqm: 3000, name: 'Grassland' } // Shared between AA2 and CMOR1
    ]

    // Standard permutations (current approach)
    const standardPermutations = Array.from(
      getLandCoverPermutationsForActionLazy(
        'AA2',
        testLandCovers,
        landCoversForActions
      )
    )

    // Optimized permutations (shared land covers at end)
    const optimizedPermutations = Array.from(
      getLandCoverPermutationsForActionOptimizedLazy(
        'AA2',
        testLandCovers,
        landCoversForActions,
        'CMOR1' // The action we're optimizing for
      )
    )

    // Standard permutations should include both orders
    expect(standardPermutations).toEqual([
      ['Woodland', 'Grassland'],
      ['Grassland', 'Woodland']
    ])

    // Optimized permutations should prioritize putting shared land cover (Grassland) at the end
    expect(optimizedPermutations).toEqual([
      ['Woodland', 'Grassland'] // Grassland (shared with CMOR1) is at the end
    ])

    // Test the actual area calculation difference
    const standardLandCoverOrder: LandCoverOrderPerAction = {
      AA2: ['Grassland', 'Woodland'] // Grassland first (worse for CMOR1)
    }

    const optimizedLandCoverOrder: LandCoverOrderPerAction = {
      AA2: ['Woodland', 'Grassland'] // Grassland last (better for CMOR1)
    }

    const totalCompatibleArea = calculateTotalCompatibleLandCoverArea(
      'CMOR1',
      testLandCovers,
      landCoversForActions
    )
    const compatibleLandCovers = getCompatibleLandCoversWithAreas(
      'CMOR1',
      testLandCovers,
      landCoversForActions
    )

    const standardAvailableArea = calculateAvailableAreaForAction(
      'CMOR1',
      totalCompatibleArea,
      compatibleLandCovers,
      testActions,
      testLandCovers,
      standardLandCoverOrder,
      compatibilityCheckFn
    )

    const optimizedAvailableArea = calculateAvailableAreaForAction(
      'CMOR1',
      totalCompatibleArea,
      compatibleLandCovers,
      testActions,
      testLandCovers,
      optimizedLandCoverOrder,
      compatibilityCheckFn
    )

    // With standard order: AA2 uses 2000 sqm of Grassland first, then 500 sqm of Woodland
    // Leaving 1000 sqm of Grassland for CMOR1
    expect(standardAvailableArea).toBe(1000)

    // With optimized order: AA2 uses 1500 sqm of Woodland first, then 500 sqm of Grassland
    // Leaving 2500 sqm of Grassland for CMOR1
    expect(optimizedAvailableArea).toBe(2500)

    // Optimized approach should provide more available area
    expect(optimizedAvailableArea).toBeGreaterThan(standardAvailableArea)
  })

  test('optimized permutations generate all combinations with shared land covers at end', () => {
    // Test scenario with more land covers to demonstrate multiple permutations
    // AA4 can use ['Meadow', 'Wetland', 'Woodland', 'Grassland']
    // Target action CMOR1 uses ['Grassland']
    // So non-shared: ['Meadow', 'Wetland', 'Woodland'] and shared: ['Grassland']

    const testLandCovers: LandCover[] = [
      { areaSqm: 1000, name: 'Meadow' },
      { areaSqm: 1000, name: 'Wetland' },
      { areaSqm: 1000, name: 'Woodland' },
      { areaSqm: 1000, name: 'Grassland' }
    ]

    // Standard permutations include all 24 permutations (4!)
    const standardPermutations = Array.from(
      getLandCoverPermutationsForActionLazy(
        'AA4',
        testLandCovers,
        landCoversForActions
      )
    )

    // Optimized permutations should only include those with Grassland at the end
    const optimizedPermutations = Array.from(
      getLandCoverPermutationsForActionOptimizedLazy(
        'AA4',
        testLandCovers,
        landCoversForActions,
        'CMOR1'
      )
    )

    expect(standardPermutations).toHaveLength(24) // 4! = 24 total permutations
    expect(optimizedPermutations).toHaveLength(6) // 3! = 6 permutations of non-shared, each ending with Grassland

    // All optimized permutations should end with 'Grassland'
    optimizedPermutations.forEach((permutation) => {
      expect(permutation.at(-1)).toBe('Grassland')
    })

    // Should contain all permutations of ['Meadow', 'Wetland', 'Woodland'] + 'Grassland'
    const expectedOptimized = [
      ['Meadow', 'Wetland', 'Woodland', 'Grassland'],
      ['Meadow', 'Woodland', 'Wetland', 'Grassland'],
      ['Wetland', 'Meadow', 'Woodland', 'Grassland'],
      ['Wetland', 'Woodland', 'Meadow', 'Grassland'],
      ['Woodland', 'Meadow', 'Wetland', 'Grassland'],
      ['Woodland', 'Wetland', 'Meadow', 'Grassland']
    ]

    expect(optimizedPermutations).toEqual(
      expect.arrayContaining(expectedOptimized)
    )
  })
})
