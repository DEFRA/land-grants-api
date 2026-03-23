import { heapsPermutations } from '@mgcrea/heaps-permutations'
import { expect, describe, test } from 'vitest'

// Type definitions
interface LandCover {
  areaSqm: number
  name: string
}

interface Action {
  code: string
  areaSqm: number
}

type CompatibilityMatrix = string[][]

type LandCoversForActions = Record<string, string[]>

type LandCoverOrderPerAction = Record<string, string[]>

interface ActionStack {
  stackNumber: number
  areaSqm: number
  actions: string[]
  landCover: string
}

interface ActionWithPermutations {
  code: string
  permutations: string[][]
}

type CompatibilityCheckFn = (code1: string, code2: string) => boolean

const landCoversOnParcel: LandCover[] = [
  { areaSqm: 2500, name: 'Woodland' },
  { areaSqm: 3100, name: 'Grassland' },
  { areaSqm: 1000, name: 'Car park' }
]

const existingActions: Action[] = [
  { code: 'AA1', areaSqm: 2500 },
  { code: 'AA2', areaSqm: 3000 }
]

// no action codes are compatible
const compatibilityMatrix: CompatibilityMatrix = [['AA1', 'AA3']]

const compatibilityCheckFn: CompatibilityCheckFn = (
  code1: string,
  code2: string
): boolean => {
  return compatibilityMatrix.some(
    (pair: string[]) =>
      (pair[0] === code1 && pair[1] === code2) ||
      (pair[0] === code2 && pair[1] === code1)
  )
}

const landCoversForActions: LandCoversForActions = {
  CMOR1: ['Grassland'],
  AA1: ['Woodland', 'Car park', 'Circus'],
  AA2: ['Woodland', 'Grassland', 'Deep Ocean'],
  AA3: ['Car park'],
  AA4: ['Meadow', 'Wetland', 'Woodland', 'Grassland'] // Action with multiple shared and non-shared land covers
}

function getLandCoverPermutationsForAction(
  actionCode: string,
  landCoversOnParcel: LandCover[],
  landCoversForActions: LandCoversForActions
): string[][] {
  const compatibleLandCovers: string[] = landCoversForActions[actionCode]
  const landCoverOptions: string[] = compatibleLandCovers.filter(
    (landCover: string) =>
      landCoversOnParcel.some((c: LandCover) => c.name === landCover)
  )
  console.log('landCoverOptions', landCoverOptions)
  return heapsPermutations(landCoverOptions)
}

function getLandCoverPermutationsForActionOptimized(
  actionCode: string,
  landCoversOnParcel: LandCover[],
  landCoversForActions: LandCoversForActions,
  targetActionCode: string
): string[][] {
  const compatibleLandCovers: string[] = landCoversForActions[actionCode]
  const targetCompatibleLandCovers: string[] =
    landCoversForActions[targetActionCode] || []

  const landCoverOptions: string[] = compatibleLandCovers.filter(
    (landCover: string) =>
      landCoversOnParcel.some((c: LandCover) => c.name === landCover)
  )

  // Find shared land covers between current action and target action
  const sharedLandCovers: string[] = landCoverOptions.filter(
    (landCover: string) => targetCompatibleLandCovers.includes(landCover)
  )

  // Find non-shared land covers
  const nonSharedLandCovers: string[] = landCoverOptions.filter(
    (landCover: string) => !targetCompatibleLandCovers.includes(landCover)
  )

  // If no shared land covers, return standard permutations
  if (sharedLandCovers.length === 0) {
    return heapsPermutations(landCoverOptions)
  }

  // Generate all permutations where shared land covers are at the end
  // Generate permutations of non-shared parts
  const nonSharedPermutations: string[][] =
    nonSharedLandCovers.length > 0
      ? heapsPermutations(nonSharedLandCovers)
      : [[]] // Empty array if no non-shared land covers

  // Generate permutations of shared parts
  const sharedPermutations: string[][] = heapsPermutations(sharedLandCovers)

  // Combine them: all non-shared permutations + all shared permutations
  const result: string[][] = []
  for (const nonSharedPerm of nonSharedPermutations) {
    for (const sharedPerm of sharedPermutations) {
      result.push([...nonSharedPerm, ...sharedPerm])
    }
  }

  return result
}

// Test data helper function
function createTestData(numActions: number, numLandCovers: number) {
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

describe('testing ideas for aac', () => {
  test('can make cartesian product', () => {
    const permutations = getLandCoverPermutationsForAction(
      'AA1',
      landCoversOnParcel,
      landCoversForActions
    )
    expect(permutations).toEqual([
      ['Woodland', 'Car park'],
      ['Car park', 'Woodland']
    ])
  })

  test('createAllActionLandCoverPermutations generates cartesian product', () => {
    const result = createAllActionLandCoverPermutations(
      existingActions,
      landCoversOnParcel,
      landCoversForActions
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

  test('createAllActionLandCoverPermutations generates cartesian product for large number of covers', () => {
    const { lotsOfActions, lotsOfLandCovers, landCoversForLotsOfActions } =
      createTestData(4, 4)

    const result = createAllActionLandCoverPermutations(
      lotsOfActions,
      lotsOfLandCovers,
      landCoversForLotsOfActions
    )

    expect(result).toHaveLength(331776) // 4 actions with 4 land covers each = 4!^4 = 24^4 = 331776 combinations
  })

  test('getMaximumAvailableAreaForAction returns the correct area within a reasonable time for 4 actions and 3 land covers', () => {
    const { lotsOfActions, lotsOfLandCovers, landCoversForLotsOfActions } =
      createTestData(4, 4)

    // Add CMOR1 mapping for the test
    landCoversForLotsOfActions.CMOR1 = lotsOfLandCovers.map(
      (cover: LandCover) => cover.name
    )

    // time the function to ensure it completes within a reasonable time frame (e.g. 5 seconds)
    const startTime = Date.now()

    const result = getMaximumAvailableAreaForAction(
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
    const result = calculateAvailableAreaForAction(
      'CMOR1',
      existingActions,
      landCoversOnParcel,
      landCoversForActions,
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
    const result = calculateAvailableAreaForAction(
      'CMOR1',
      existingActions,
      landCoversOnParcel,
      landCoversForActions,
      landCoverOrderPerAction,
      compatibilityCheckFn
    )

    expect(result).toBe(1100) // AA1 uses Car park (1000) + Woodland (1500), AA2 uses remaining Woodland (1000) + Grassland (2000), leaving 1100 for CMOR1 on Grassland
  })

  test('calculateAvailableAreaForAction adds up valid land covers for CMOR1', () => {
    const result = calculateAvailableAreaForAction(
      'CMOR1',
      [],
      landCoversOnParcel,
      landCoversForActions,
      {},
      () => true
    )

    expect(result).toBe(3100) // Grassland has 3100 sqm
  })

  test('getMaximumAvailableAreaForAction returns 1100 sqm for CMOR1', () => {
    const result = getMaximumAvailableAreaForAction(
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
    const standardPermutations = getLandCoverPermutationsForAction(
      'AA2',
      testLandCovers,
      landCoversForActions
    )

    // Optimized permutations (shared land covers at end)
    const optimizedPermutations = getLandCoverPermutationsForActionOptimized(
      'AA2',
      testLandCovers,
      landCoversForActions,
      'CMOR1' // The action we're optimizing for
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

    const standardAvailableArea = calculateAvailableAreaForAction(
      'CMOR1',
      testActions,
      testLandCovers,
      landCoversForActions,
      standardLandCoverOrder,
      compatibilityCheckFn
    )

    const optimizedAvailableArea = calculateAvailableAreaForAction(
      'CMOR1',
      testActions,
      testLandCovers,
      landCoversForActions,
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
    const standardPermutations = getLandCoverPermutationsForAction(
      'AA4',
      testLandCovers,
      landCoversForActions
    )

    // Optimized permutations should only include those with Grassland at the end
    const optimizedPermutations = getLandCoverPermutationsForActionOptimized(
      'AA4',
      testLandCovers,
      landCoversForActions,
      'CMOR1'
    )

    expect(standardPermutations).toHaveLength(24) // 4! = 24 total permutations
    expect(optimizedPermutations).toHaveLength(6) // 3! = 6 permutations of non-shared, each ending with Grassland

    // All optimized permutations should end with 'Grassland'
    optimizedPermutations.forEach((permutation) => {
      expect(permutation[permutation.length - 1]).toBe('Grassland')
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

function createAllActionLandCoverPermutations(
  actions: Action[],
  landCoversOnParcel: LandCover[],
  landCoversForActions: LandCoversForActions
): LandCoverOrderPerAction[] {
  const actionLandCoverPermutations: ActionWithPermutations[] = actions.map(
    (action: Action) => {
      const permutationsForAction: string[][] =
        getLandCoverPermutationsForAction(
          action.code,
          landCoversOnParcel,
          landCoversForActions
        )
      return { code: action.code, permutations: permutationsForAction }
    }
  )

  // Generate cartesian product of all action permutations
  let result: LandCoverOrderPerAction[] = [{}]

  for (const actionWithPerms of actionLandCoverPermutations) {
    const newResult: LandCoverOrderPerAction[] = []

    for (const existingCombination of result) {
      for (const permutation of actionWithPerms.permutations) {
        newResult.push({
          ...existingCombination,
          [actionWithPerms.code]: permutation
        })
      }
    }

    result = newResult
  }

  return result
}

function calculateAvailableAreaForAction(
  actionCode: string,
  existingActions: Action[],
  landCoversOnParcel: LandCover[],
  landCoversForActions: LandCoversForActions,
  landCoverOrderPerAction: LandCoverOrderPerAction,
  compatibilityCheckFn: CompatibilityCheckFn
): number {
  const compatibleLandCovers: string[] = landCoversForActions[actionCode]

  // If we have landCoverOrderPerAction and compatibilityCheckFn, use stack-based calculation
  if (
    landCoverOrderPerAction &&
    compatibilityCheckFn &&
    Object.keys(landCoverOrderPerAction).length > 0
  ) {
    // Create stacks from existing actions
    const stacks: ActionStack[] = createActionStacks(
      existingActions,
      landCoversOnParcel,
      landCoverOrderPerAction,
      compatibilityCheckFn
    )

    return compatibleLandCovers.reduce(
      (totalArea: number, landCoverName: string): number => {
        const landCover: LandCover | undefined = landCoversOnParcel.find(
          (cover: LandCover) => cover.name === landCoverName
        )
        if (!landCover) return totalArea

        let availableArea: number = landCover.areaSqm

        // Subtract area of stacks that contain incompatible actions on this land cover
        const stacksOnThisLandCover: ActionStack[] = stacks.filter(
          (stack: ActionStack) => stack.landCover === landCoverName
        )

        for (const stack of stacksOnThisLandCover) {
          const hasIncompatibleAction: boolean = stack.actions.some(
            (existingActionCode: string) =>
              !compatibilityCheckFn(actionCode, existingActionCode)
          )

          if (hasIncompatibleAction) {
            availableArea -= stack.areaSqm
          }
        }

        return totalArea + Math.max(0, availableArea)
      },
      0
    )
  }

  // Fallback to original simple calculation
  return compatibleLandCovers.reduce(
    (totalArea: number, landCoverName: string): number => {
      const landCover: LandCover | undefined = landCoversOnParcel.find(
        (cover: LandCover) => cover.name === landCoverName
      )
      return totalArea + (landCover ? landCover.areaSqm : 0)
    },
    0
  )
}

function createActionStacks(
  existingActions: Action[],
  landCoversOnParcel: LandCover[],
  landCoverOrderPerAction: LandCoverOrderPerAction,
  compatibilityCheckFn: CompatibilityCheckFn
): ActionStack[] {
  const stacks: ActionStack[] = []
  let stackNumber: number = 1

  // Track remaining area for each land cover
  const remainingAreaByLandCover: Record<string, number> = {}
  landCoversOnParcel.forEach((landCover: LandCover) => {
    remainingAreaByLandCover[landCover.name] = landCover.areaSqm
  })

  for (const action of existingActions) {
    let remainingActionArea: number = action.areaSqm
    const preferredLandCovers: string[] = landCoverOrderPerAction[action.code]

    // Safety check: if no land cover order is defined for this action, skip it
    if (!preferredLandCovers) {
      continue
    }

    // Allocate action area across preferred land covers
    for (const landCoverName of preferredLandCovers) {
      if (remainingActionArea <= 0) break

      const availableLandCover: LandCover | undefined = landCoversOnParcel.find(
        (cover: LandCover) => cover.name === landCoverName
      )
      if (!availableLandCover) continue

      // Check if there's an existing stack on this land cover where this action is compatible
      const compatibleStack: ActionStack | undefined = stacks.find(
        (stack: ActionStack) =>
          stack.landCover === landCoverName &&
          stack.actions.every((existingActionCode: string) =>
            compatibilityCheckFn(action.code, existingActionCode)
          )
      )

      if (compatibleStack) {
        // Add action to existing compatible stack - compatible actions can share the same area
        compatibleStack.actions.push(action.code)
        // Compatible actions share physical space, so this action is fully accommodated
        break
      }

      // No compatible stack found, check if we have available area for a new stack
      const availableArea: number = remainingAreaByLandCover[landCoverName]
      if (availableArea <= 0) continue

      // Allocate as much area as possible to this land cover
      const allocatedArea: number = Math.min(remainingActionArea, availableArea)

      stacks.push({
        stackNumber: stackNumber++,
        areaSqm: allocatedArea,
        actions: [action.code],
        landCover: landCoverName
      })

      // Update remaining areas
      remainingActionArea -= allocatedArea
      remainingAreaByLandCover[landCoverName] -= allocatedArea
    }
  }

  return stacks
}

function getMaximumAvailableAreaForAction(
  actionCode: string,
  existingActions: Action[],
  landCoversOnParcel: LandCover[],
  landCoversForActions: LandCoversForActions,
  compatibilityCheckFn: CompatibilityCheckFn
): number {
  // Generate all possible land cover order combinations for existing actions
  const allLandCoverOrders: LandCoverOrderPerAction[] =
    createAllActionLandCoverPermutations(
      existingActions,
      landCoversOnParcel,
      landCoversForActions
    )

  console.log('allLandCoverOrders count', allLandCoverOrders.length)

  let maxAvailableArea: number = 0
  let numberOfPermutationsProcessed: number = 0

  // Test each combination to find the maximum available area
  for (const landCoverOrderPerAction of allLandCoverOrders) {
    // Calculate available area for this combination
    const availableArea: number = calculateAvailableAreaForAction(
      actionCode,
      existingActions,
      landCoversOnParcel,
      landCoversForActions,
      landCoverOrderPerAction,
      compatibilityCheckFn
    )

    // Track the maximum
    maxAvailableArea = Math.max(maxAvailableArea, availableArea)
    numberOfPermutationsProcessed++
  }

  console.log('numberOfPermutationsProcessed', numberOfPermutationsProcessed)

  return maxAvailableArea
}
