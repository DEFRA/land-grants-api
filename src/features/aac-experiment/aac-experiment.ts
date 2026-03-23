import { heapsPermutations } from '@mgcrea/heaps-permutations'
import * as generatorics from 'generatorics'
import {
  LandCover,
  Action,
  CompatibilityMatrix,
  LandCoversForActions,
  LandCoverOrderPerAction,
  ActionStack,
  ActionWithPermutations,
  CompatibilityCheckFn
} from './aac-experiment.types.ts'

// Test data constants
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

export const landCoversForActions: LandCoversForActions = {
  CMOR1: ['Grassland'],
  AA1: ['Woodland', 'Car park', 'Circus'],
  AA2: ['Woodland', 'Grassland', 'Deep Ocean'],
  AA3: ['Car park'],
  AA4: ['Meadow', 'Wetland', 'Woodland', 'Grassland'] // Action with multiple shared and non-shared land covers
}

// Helper functions
export function getLandCoverPermutationsForAction(
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

export function getLandCoverPermutationsForActionOptimized(
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

// Lazy evaluation versions using simple generator implementation
// Helper function to generate permutations lazily
function* simplePermutations<T>(arr: T[]): Generator<T[], void, unknown> {
  if (arr.length <= 1) {
    yield [...arr]
    return
  }

  for (let i = 0; i < arr.length; i++) {
    const current = arr[i]
    const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)]

    for (const perm of simplePermutations(remaining)) {
      yield [current, ...perm]
    }
  }
}

// Helper function to generate cartesian product lazily
function* cartesianProduct<T>(...arrays: T[][]): Generator<T[], void, unknown> {
  if (arrays.length === 0) {
    yield []
    return
  }

  if (arrays.length === 1) {
    for (const item of arrays[0]) {
      yield [item]
    }
    return
  }

  const [firstArray, ...restArrays] = arrays

  for (const firstItem of firstArray) {
    for (const restItems of cartesianProduct(...restArrays)) {
      yield [firstItem, ...restItems]
    }
  }
}

export function* getLandCoverPermutationsForActionLazy(
  actionCode: string,
  landCoversOnParcel: LandCover[],
  landCoversForActions: LandCoversForActions
): Generator<string[], void, unknown> {
  const compatibleLandCovers: string[] = landCoversForActions[actionCode]
  const landCoverOptions: string[] = compatibleLandCovers.filter(
    (landCover: string) =>
      landCoversOnParcel.some((c: LandCover) => c.name === landCover)
  )

  // Use our simple permutation generator
  yield* simplePermutations(landCoverOptions)
}

export function* getLandCoverPermutationsForActionOptimizedLazy(
  actionCode: string,
  landCoversOnParcel: LandCover[],
  landCoversForActions: LandCoversForActions,
  targetActionCode: string
): Generator<string[], void, unknown> {
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
    yield* simplePermutations(landCoverOptions)
    return
  }

  // Generate all permutations where shared land covers are at the end
  if (nonSharedLandCovers.length > 0) {
    // We have both non-shared and shared land covers
    for (const nonSharedPerm of simplePermutations(nonSharedLandCovers)) {
      for (const sharedPerm of simplePermutations(sharedLandCovers)) {
        yield [...nonSharedPerm, ...sharedPerm]
      }
    }
  } else {
    // Only shared land covers - just generate permutations of them
    yield* simplePermutations(sharedLandCovers)
  }
}

export function* createAllActionLandCoverPermutationsLazy(
  actions: Action[],
  landCoversOnParcel: LandCover[],
  landCoversForActions: LandCoversForActions
): Generator<LandCoverOrderPerAction, void, unknown> {
  // Create arrays of all permutations for each action
  const actionPermutationArrays = actions.map((action: Action) => {
    const permutationsForAction = Array.from(
      getLandCoverPermutationsForActionLazy(
        action.code,
        landCoversOnParcel,
        landCoversForActions
      )
    )
    return {
      code: action.code,
      permutations: permutationsForAction
    }
  })

  // Create arrays for cartesian product
  const permutationArrays = actionPermutationArrays.map(
    (actionWithPerms) => actionWithPerms.permutations
  )

  // Use our simple cartesian product generator
  for (const combination of cartesianProduct(...permutationArrays)) {
    const result: LandCoverOrderPerAction = {}

    // Map the combination back to action codes
    actionPermutationArrays.forEach((actionWithPerms, index) => {
      result[actionWithPerms.code] = combination[index]
    })

    yield result
  }
}

export function getMaximumAvailableAreaForActionLazy(
  actionCode: string,
  existingActions: Action[],
  landCoversOnParcel: LandCover[],
  landCoversForActions: LandCoversForActions,
  compatibilityCheckFn: CompatibilityCheckFn
): number {
  // Use lazy evaluation to process land cover order combinations
  const allLandCoverOrdersLazy = createAllActionLandCoverPermutationsLazy(
    existingActions,
    landCoversOnParcel,
    landCoversForActions
  )

  let maxAvailableArea: number = 0
  let numberOfPermutationsProcessed: number = 0

  // Lazily process each combination to find the maximum available area
  for (const landCoverOrderPerAction of allLandCoverOrdersLazy) {
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

    // Optional: Could add early termination logic here
    // if (maxAvailableArea >= someThreshold) break
  }

  console.log(
    'lazy numberOfPermutationsProcessed',
    numberOfPermutationsProcessed
  )

  return maxAvailableArea
}

// Main logic functions
export function createAllActionLandCoverPermutations(
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

export function calculateAvailableAreaForAction(
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

export function createActionStacks(
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

export function getMaximumAvailableAreaForAction(
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
