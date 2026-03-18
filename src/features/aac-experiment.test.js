import { heapsPermutations } from '@mgcrea/heaps-permutations'
import { expect } from 'vitest'

const landCoversOnParcel = [
  { areaSqm: 2500, name: 'Woodland' },
  { areaSqm: 3100, name: 'Grassland' },
  { areaSqm: 1000, name: 'Car park' }
]

const existingActions = [
  { code: 'AA1', areaSqm: 2500 },
  { code: 'AA2', areaSqm: 3000 }
]

// no action codes are compatible
const compatibilityMatrix = [['AA1', 'AA3']]

const compatibilityCheckFn = (code1, code2) => {
  return compatibilityMatrix.some(
    (pair) =>
      (pair[0] === code1 && pair[1] === code2) ||
      (pair[0] === code2 && pair[1] === code1)
  )
}

const landCoversForActions = {
  CMOR1: ['Grassland'],
  AA1: ['Woodland', 'Car park', 'Circus'],
  AA2: ['Woodland', 'Grassland', 'Deep Ocean'],
  AA3: ['Car park']
}

function getLandCoverPermutationsForAction(
  actionCode,
  landCoversOnParcel,
  landCoversForActions
) {
  const compatibleLandCovers = landCoversForActions[actionCode]
  const landCoverOptions = compatibleLandCovers.filter((landCover) =>
    landCoversOnParcel.some((c) => c.name === landCover)
  )
  console.log('landCoverOptions', landCoverOptions)
  return heapsPermutations(landCoverOptions)
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
      [
        { code: 'AA1', landCovers: ['Woodland', 'Car park'] },
        { code: 'AA2', landCovers: ['Woodland', 'Grassland'] }
      ],
      [
        { code: 'AA1', landCovers: ['Woodland', 'Car park'] },
        { code: 'AA2', landCovers: ['Grassland', 'Woodland'] }
      ],
      [
        { code: 'AA1', landCovers: ['Car park', 'Woodland'] },
        { code: 'AA2', landCovers: ['Woodland', 'Grassland'] }
      ],
      [
        { code: 'AA1', landCovers: ['Car park', 'Woodland'] },
        { code: 'AA2', landCovers: ['Grassland', 'Woodland'] }
      ]
    ])
  })

  test('createActionStacks creates stacks in order of land cover preference- [Woodland, Car park] for AA1', () => {
    const landCoverOrderPerAction = {
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
    const landCoverOrderPerAction = {
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
    const landCoverOrderPerAction = {
      AA1: ['Car park', 'Woodland'],
      AA2: ['Woodland', 'Grassland'],
      AA3: ['Car park']
    }

    const existingActionForThisTest = [
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
    const landCoverOrderPerAction = {
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
    const landCoverOrderPerAction = {
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
})

function createAllActionLandCoverPermutations(
  actions,
  landCoversOnParcel,
  landCoversForActions
) {
  const actionLandCoverPermutations = actions.map((action) => {
    const permutationsForAction = getLandCoverPermutationsForAction(
      action.code,
      landCoversOnParcel,
      landCoversForActions
    )
    return { code: action.code, permutations: permutationsForAction }
  })

  const [first, second] = actionLandCoverPermutations
  return first.permutations.flatMap((firstPerm) =>
    second.permutations.map((secondPerm) => [
      { code: first.code, landCovers: firstPerm },
      { code: second.code, landCovers: secondPerm }
    ])
  )
}

function calculateAvailableAreaForAction(
  actionCode,
  existingActions,
  landCoversOnParcel,
  landCoversForActions,
  landCoverOrderPerAction,
  compatibilityCheckFn
) {
  const compatibleLandCovers = landCoversForActions[actionCode]

  // If we have landCoverOrderPerAction and compatibilityCheckFn, use stack-based calculation
  if (
    landCoverOrderPerAction &&
    compatibilityCheckFn &&
    Object.keys(landCoverOrderPerAction).length > 0
  ) {
    // Create stacks from existing actions
    const stacks = createActionStacks(
      existingActions,
      landCoversOnParcel,
      landCoverOrderPerAction,
      compatibilityCheckFn
    )

    return compatibleLandCovers.reduce((totalArea, landCoverName) => {
      const landCover = landCoversOnParcel.find(
        (cover) => cover.name === landCoverName
      )
      if (!landCover) return totalArea

      let availableArea = landCover.areaSqm

      // Subtract area of stacks that contain incompatible actions on this land cover
      const stacksOnThisLandCover = stacks.filter(
        (stack) => stack.landCover === landCoverName
      )

      for (const stack of stacksOnThisLandCover) {
        const hasIncompatibleAction = stack.actions.some(
          (existingActionCode) =>
            !compatibilityCheckFn(actionCode, existingActionCode)
        )

        if (hasIncompatibleAction) {
          availableArea -= stack.areaSqm
        }
      }

      return totalArea + Math.max(0, availableArea)
    }, 0)
  }

  // Fallback to original simple calculation
  return compatibleLandCovers.reduce((totalArea, landCoverName) => {
    const landCover = landCoversOnParcel.find(
      (cover) => cover.name === landCoverName
    )
    return totalArea + (landCover ? landCover.areaSqm : 0)
  }, 0)
}

function createActionStacks(
  existingActions,
  landCoversOnParcel,
  landCoverOrderPerAction,
  compatibilityCheckFn
) {
  const stacks = []
  let stackNumber = 1

  // Track remaining area for each land cover
  const remainingAreaByLandCover = {}
  landCoversOnParcel.forEach((landCover) => {
    remainingAreaByLandCover[landCover.name] = landCover.areaSqm
  })

  for (const action of existingActions) {
    let remainingActionArea = action.areaSqm
    const preferredLandCovers = landCoverOrderPerAction[action.code]

    // Allocate action area across preferred land covers
    for (const landCoverName of preferredLandCovers) {
      if (remainingActionArea <= 0) break

      const availableLandCover = landCoversOnParcel.find(
        (cover) => cover.name === landCoverName
      )
      if (!availableLandCover) continue

      // Check if there's an existing stack on this land cover where this action is compatible
      const compatibleStack = stacks.find(
        (stack) =>
          stack.landCover === landCoverName &&
          stack.actions.every((existingActionCode) =>
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
      const availableArea = remainingAreaByLandCover[landCoverName]
      if (availableArea <= 0) continue

      // Allocate as much area as possible to this land cover
      const allocatedArea = Math.min(remainingActionArea, availableArea)

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
  actionCode,
  existingActions,
  landCoversOnParcel,
  landCoversForActions,
  compatibilityCheckFn
) {
  // Generate all possible land cover order combinations for existing actions
  const allActionPermutations = createAllActionLandCoverPermutations(
    existingActions,
    landCoversOnParcel,
    landCoversForActions
  )

  let maxAvailableArea = 0

  // Test each combination to find the maximum available area
  for (const permutationSet of allActionPermutations) {
    // Convert permutation set to landCoverOrderPerAction format
    const landCoverOrderPerAction = {}
    for (const actionPermutation of permutationSet) {
      landCoverOrderPerAction[actionPermutation.code] =
        actionPermutation.landCovers
    }

    // Calculate available area for this combination
    const availableArea = calculateAvailableAreaForAction(
      actionCode,
      existingActions,
      landCoversOnParcel,
      landCoversForActions,
      landCoverOrderPerAction,
      compatibilityCheckFn
    )

    // Track the maximum
    maxAvailableArea = Math.max(maxAvailableArea, availableArea)
  }

  return maxAvailableArea
}
