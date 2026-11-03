import { BOTH_SIDES } from '~/src/features/common/constants/sidedness.js'
import { findMinimumBoundary, incompatibleWith } from './minimumBoundary.js'
import { compatibleOnly } from './testUtils.js'

const occupancy = (actionCode, occupiedMeters) => ({
  actionCode,
  billedLengthMeters: occupiedMeters,
  sidedness: BOTH_SIDES,
  occupiedMeters
})

describe('incompatibleWith', () => {
  it('keeps only the actions that cannot share with the one given, in the order given', () => {
    const bnd1 = occupancy('BND1', 200)
    const chrw2 = occupancy('CHRW2', 400)
    const hrw1 = occupancy('HRW1', 150)

    const incompatible = incompatibleWith(
      'BND2',
      [bnd1, chrw2, hrw1],
      compatibleOnly(['BND2', 'CHRW2'])
    )

    expect(incompatible).toEqual([bnd1, hrw1])
  })

  it('keeps none when every action can share with the one given', () => {
    const chrw2 = occupancy('CHRW2', 400)

    const incompatible = incompatibleWith(
      'BND2',
      [chrw2],
      compatibleOnly(['BND2', 'CHRW2'])
    )

    expect(incompatible).toEqual([])
  })

  it('keeps none of no actions', () => {
    const incompatible = incompatibleWith('BND2', [], compatibleOnly())

    expect(incompatible).toEqual([])
  })
})

describe('findMinimumBoundary', () => {
  it('needs no boundary for no actions', () => {
    const minimumBoundary = findMinimumBoundary([], compatibleOnly())

    expect(minimumBoundary).toEqual({ actions: [], meters: 0 })
  })

  it('adds up actions that cannot share', () => {
    const bnd1 = occupancy('BND1', 200)
    const hrw1 = occupancy('HRW1', 150)

    const minimumBoundary = findMinimumBoundary([bnd1, hrw1], compatibleOnly())

    expect(minimumBoundary).toEqual({ actions: [bnd1, hrw1], meters: 350 })
  })

  it('counts actions that can share once, choosing the one needing more', () => {
    const bnd2 = occupancy('BND2', 500)
    const chrw2 = occupancy('CHRW2', 750)

    const minimumBoundary = findMinimumBoundary(
      [bnd2, chrw2],
      compatibleOnly(['BND2', 'CHRW2'])
    )

    expect(minimumBoundary).toEqual({ actions: [chrw2], meters: 750 })
  })

  it('chooses the arrangement whose first action comes earliest when two need the same', () => {
    const chrw2 = occupancy('CHRW2', 750)
    const bnd2 = occupancy('BND2', 750)

    const minimumBoundary = findMinimumBoundary(
      [chrw2, bnd2],
      compatibleOnly(['BND2', 'CHRW2'])
    )

    expect(minimumBoundary).toEqual({ actions: [chrw2], meters: 750 })
  })

  it('only lays end to end actions that cannot share with any other laid end to end', () => {
    // A cannot share with B or C, but B and C can share, so A goes beside the longer of them
    const a = occupancy('A', 100)
    const b = occupancy('B', 300)
    const c = occupancy('C', 200)

    const minimumBoundary = findMinimumBoundary(
      [a, b, c],
      compatibleOnly(['B', 'C'])
    )

    expect(minimumBoundary).toEqual({ actions: [a, b], meters: 400 })
  })

  it('falls short of the true minimum for a ring of five, a known limit', () => {
    // Only neighbours cannot share, so two fit any stretch and the five truly need 5 x 360 / 2 = 900 m, but only a pair is found
    const a = occupancy('A', 360)
    const b = occupancy('B', 360)
    const c = occupancy('C', 360)
    const d = occupancy('D', 360)
    const e = occupancy('E', 360)

    const minimumBoundary = findMinimumBoundary(
      [a, b, c, d, e],
      compatibleOnly(['A', 'C'], ['A', 'D'], ['B', 'D'], ['B', 'E'], ['C', 'E'])
    )

    expect(minimumBoundary).toEqual({ actions: [a, b], meters: 720 })
  })
})
