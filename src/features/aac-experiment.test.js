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
const compatibilityMatrix = [[]]

const landCoversForActions = {
  CMOR1: ['Grassland'],
  AA1: ['Woodland', 'Car park', 'Circus'],
  AA2: ['Woodland', 'Grassland', 'Deep Ocean']
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
      landCoversForActions,
      compatibilityMatrix,
      landCoverOrderPerAction
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
      landCoversForActions,
      compatibilityMatrix,
      landCoverOrderPerAction
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

  test('calculateAvailableAreaForAction adds up valid land covers for CMOR1', () => {
    const result = calculateAvailableAreaForAction(
      'CMOR1',
      [],
      landCoversOnParcel,
      landCoversForActions
    )

    expect(result).toBe(3100) // Grassland has 3100 sqm
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
  landCoversForActions
) {
  const compatibleLandCovers = landCoversForActions[actionCode]

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
  landCoversForActions,
  compatibilityMatrix,
  landCoverOrderPerAction
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
