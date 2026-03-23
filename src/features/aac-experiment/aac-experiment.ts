import { permutation, cartesian } from 'generatorics'
import {
  LandCover,
  Action,
  CompatibilityMatrix,
  LandCoversForActions,
  LandCoverOrderPerAction,
  ActionStack,
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

  // Use generatorics for lazy permutation generation - convert each permutation to array
  const perms = permutation(landCoverOptions)
  for (const perm of perms) {
    yield [...perm]
  }
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
    const perms = permutation(landCoverOptions)
    for (const perm of perms) {
      yield [...perm]
    }
    return
  }

  // Generate all permutations where shared land covers are at the end
  if (nonSharedLandCovers.length > 0) {
    // We have both non-shared and shared land covers
    const nonSharedPerms = permutation(nonSharedLandCovers)

    for (const nonSharedPerm of nonSharedPerms) {
      // Create fresh generator for each iteration to avoid consumption issue
      const sharedPerms = permutation(sharedLandCovers)
      for (const sharedPerm of sharedPerms) {
        yield [...nonSharedPerm, ...sharedPerm]
      }
    }
  } else {
    // Only shared land covers - just generate permutations of them
    const perms = permutation(sharedLandCovers)
    for (const perm of perms) {
      yield [...perm]
    }
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

  // Use generatorics cartesian product for lazy generation
  const cartesianPerms = cartesian(...permutationArrays)
  for (const combination of cartesianPerms) {
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
  const stackState = initializeStackState(landCoversOnParcel)

  for (const action of existingActions) {
    allocateAction(
      stackState,
      action,
      landCoverOrderPerAction,
      compatibilityCheckFn
    )
  }

  return stackState.stacks
}

interface StackState {
  stacks: ActionStack[]
  stackNumber: number
  remainingAreaByLandCover: Record<string, number>
}

function initializeStackState(landCoversOnParcel: LandCover[]): StackState {
  const remainingAreaByLandCover: Record<string, number> = {}
  landCoversOnParcel.forEach((landCover: LandCover) => {
    remainingAreaByLandCover[landCover.name] = landCover.areaSqm
  })

  return {
    stacks: [],
    stackNumber: 1,
    remainingAreaByLandCover
  }
}

function allocateAction(
  stackState: StackState,
  action: Action,
  landCoverOrderPerAction: LandCoverOrderPerAction,
  compatibilityCheckFn: CompatibilityCheckFn
): void {
  const preferredLandCovers = landCoverOrderPerAction[action.code]

  if (!preferredLandCovers) {
    return // Skip actions without land cover preferences
  }

  let remainingActionArea = action.areaSqm

  for (const landCoverName of preferredLandCovers) {
    if (remainingActionArea <= 0) break

    remainingActionArea = tryAllocateToLandCover(
      stackState,
      action.code,
      landCoverName,
      remainingActionArea,
      compatibilityCheckFn
    )
  }
}

function tryAllocateToLandCover(
  stackState: StackState,
  actionCode: string,
  landCoverName: string,
  remainingActionArea: number,
  compatibilityCheckFn: CompatibilityCheckFn
): number {
  const compatibleStack = findCompatibleStack(
    stackState.stacks,
    landCoverName,
    actionCode,
    compatibilityCheckFn
  )

  if (compatibleStack) {
    return addToExistingStack(compatibleStack, actionCode)
  }

  return createNewStackIfPossible(
    stackState,
    actionCode,
    landCoverName,
    remainingActionArea
  )
}

function findCompatibleStack(
  stacks: ActionStack[],
  landCoverName: string,
  actionCode: string,
  compatibilityCheckFn: CompatibilityCheckFn
): ActionStack | undefined {
  return stacks.find(
    (stack: ActionStack) =>
      stack.landCover === landCoverName &&
      stack.actions.every((existingActionCode: string) =>
        compatibilityCheckFn(actionCode, existingActionCode)
      )
  )
}

function addToExistingStack(
  compatibleStack: ActionStack,
  actionCode: string
): number {
  compatibleStack.actions.push(actionCode)
  return 0 // Compatible actions share physical space, so action is fully accommodated
}

function createNewStackIfPossible(
  stackState: StackState,
  actionCode: string,
  landCoverName: string,
  remainingActionArea: number
): number {
  const availableArea = stackState.remainingAreaByLandCover[landCoverName]

  if (availableArea <= 0) {
    return remainingActionArea // Cannot allocate to this land cover
  }

  const allocatedArea = Math.min(remainingActionArea, availableArea)

  stackState.stacks.push({
    stackNumber: stackState.stackNumber++,
    areaSqm: allocatedArea,
    actions: [actionCode],
    landCover: landCoverName
  })

  stackState.remainingAreaByLandCover[landCoverName] -= allocatedArea
  return remainingActionArea - allocatedArea
}
