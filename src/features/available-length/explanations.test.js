import { calculateAvailableLength } from './availableLength.js'
import { formatLengthExplanationSections } from './explanations.js'
import {
  LINEAR_SIDEDNESS,
  compatibleOnly,
  existing,
  parcel
} from './testUtils.js'

describe('formatLengthExplanationSections', () => {
  it('explains why each existing action is or is not deducted', () => {
    // Applying for BND2 on a 1000 m boundary that already has CHRW2 (400 m) and BND1 (200 m)
    const availableLength = calculateAvailableLength(
      'BND2',
      [existing('CHRW2', 400), existing('BND1', 200)],
      parcel()
    )

    const sections = formatLengthExplanationSections(availableLength, {
      targetAction: 'BND2',
      targetSidedness: LINEAR_SIDEDNESS.BND2
    })

    expect(sections).toEqual([
      {
        title: 'Application',
        content: ['Target action: BND2', 'Sidedness: single-side']
      },
      { title: 'Parcel boundary', content: ['Parcel boundary: 1000 m'] },
      {
        title: 'Existing actions on the boundary',
        content: [
          'CHRW2: billed 400 m, single-side, occupies 200 m of boundary. Can share with BND2, so it is not deducted',
          'BND1: billed 200 m, both-sides, occupies 200 m of boundary. Cannot share with BND2, so it is deducted'
        ]
      },
      { title: 'Stacks', content: ['Stack 1: BND1 (200 m)'] },
      {
        title: 'Result',
        content: [
          'Boundary occupied by incompatible actions: 200 m',
          'Free boundary: 800 m',
          'BND2 is single-side, so both faces of the free boundary can be billed',
          'Maximum available length for BND2: 1600 m'
        ]
      }
    ])
  })

  it('offers a both-sides action the free boundary once', () => {
    // Applying for BND1 on a 1000 m boundary that already has BND2 (1000 m)
    const availableLength = calculateAvailableLength(
      'BND1',
      [existing('BND2', 1000)],
      parcel()
    )

    const sections = formatLengthExplanationSections(availableLength, {
      targetAction: 'BND1',
      targetSidedness: LINEAR_SIDEDNESS.BND1
    })

    expect(sections).toEqual([
      {
        title: 'Application',
        content: ['Target action: BND1', 'Sidedness: both-sides']
      },
      { title: 'Parcel boundary', content: ['Parcel boundary: 1000 m'] },
      {
        title: 'Existing actions on the boundary',
        content: [
          'BND2: billed 1000 m, single-side, occupies 500 m of boundary. Cannot share with BND1, so it is deducted'
        ]
      },
      { title: 'Stacks', content: ['Stack 1: BND2 (500 m)'] },
      {
        title: 'Result',
        content: [
          'Boundary occupied by incompatible actions: 500 m',
          'Free boundary: 500 m',
          'Maximum available length for BND1: 500 m'
        ]
      }
    ])
  })

  it('says so when there are no existing actions on the boundary', () => {
    // Applying for BND1 on a 1000 m boundary with nothing on it
    const availableLength = calculateAvailableLength('BND1', [], parcel())

    const sections = formatLengthExplanationSections(availableLength, {
      targetAction: 'BND1',
      targetSidedness: LINEAR_SIDEDNESS.BND1
    })

    expect(sections).toEqual([
      {
        title: 'Application',
        content: ['Target action: BND1', 'Sidedness: both-sides']
      },
      { title: 'Parcel boundary', content: ['Parcel boundary: 1000 m'] },
      {
        title: 'Existing actions on the boundary',
        content: ['No existing actions on the boundary']
      },
      {
        title: 'Result',
        content: [
          'Boundary occupied by incompatible actions: 0 m',
          'Free boundary: 1000 m',
          'Maximum available length for BND1: 1000 m'
        ]
      }
    ])
  })

  it('reports an error and no available length when the existing actions do not fit the boundary', () => {
    // Applying for BND2 on a 1000 m boundary that already has BND1 (1200 m), which cannot fit
    const availableLength = calculateAvailableLength(
      'BND2',
      [existing('BND1', 1200)],
      parcel()
    )

    const sections = formatLengthExplanationSections(availableLength, {
      targetAction: 'BND2',
      targetSidedness: LINEAR_SIDEDNESS.BND2
    })

    expect(sections).toEqual([
      {
        title: 'Application',
        content: ['Target action: BND2', 'Sidedness: single-side']
      },
      { title: 'Parcel boundary', content: ['Parcel boundary: 1000 m'] },
      {
        title: 'Existing actions on the boundary',
        content: [
          'BND1: billed 1200 m, both-sides, occupies 1200 m of boundary. Counted in the boundary the existing actions need'
        ]
      },
      { title: 'Stacks', content: ['Stack 1: BND1 (1200 m)'] },
      {
        title: 'Error - existing actions do not fit',
        content: [
          'The existing actions need 1200 m of boundary however they are arranged, but the parcel boundary is only 1000 m. This requires a manual review and existing agreements may need adjusting.'
        ]
      },
      {
        title: 'Result',
        content: ['Maximum available length for BND2: 0 m']
      }
    ])
  })
  it('explains an incompatible action that stacks on one already deducted', () => {
    // The ticket's parcel: BND2 and CHRW1 cannot share with BND1, but both stack on CHRW2
    const sidednessByActionCode = {
      BND1: 'both-sides',
      BND2: 'single-side',
      CHRW1: 'single-side',
      CHRW2: 'single-side'
    }
    const compatibilityCheckFn = compatibleOnly(
      ['BND2', 'CHRW2'],
      ['CHRW1', 'CHRW2'],
      ['BND2', 'CHRW1'],
      ['NUM1', 'BND1'],
      ['CIPM1', 'BND1'],
      ['NUM1', 'CIPM1'],
      ['NUM1', 'CHRW2'],
      ['NUM1', 'FG2'],
      ['NUM1', 'BE1'],
      ['CIPM1', 'CHRW2'],
      ['CIPM1', 'FG2'],
      ['CIPM1', 'BE1']
    )
    const availableLength = calculateAvailableLength(
      'BND1',
      [
        existing('BND2', 200),
        existing('CHRW2', 500),
        existing('CHRW1', 400),
        existing('FG2', 100),
        existing('BE1', 100),
        existing('NUM1', 500),
        existing('CIPM1', 250)
      ],
      parcel({
        boundaryLengthMeters: 1441,
        compatibilityCheckFn,
        sidednessByActionCode
      })
    )

    const sections = formatLengthExplanationSections(availableLength, {
      targetAction: 'BND1',
      targetSidedness: 'both-sides'
    })

    expect(sections.slice(2)).toEqual([
      {
        title: 'Existing actions on the boundary',
        content: [
          'BND2: billed 200 m, single-side, occupies 100 m of boundary. Cannot share with BND1, but shares a stretch with CHRW2, which is already deducted',
          'CHRW2: billed 500 m, single-side, occupies 250 m of boundary. Cannot share with BND1, so it is deducted',
          'CHRW1: billed 400 m, single-side, occupies 200 m of boundary. Cannot share with BND1, but shares a stretch with CHRW2, which is already deducted',
          'FG2: billed 100 m, both-sides, occupies 100 m of boundary. Cannot share with BND1, so it is deducted',
          'BE1: billed 100 m, both-sides, occupies 100 m of boundary. Cannot share with BND1, so it is deducted',
          'NUM1: billed 500 m, both-sides, occupies 500 m of boundary. Can share with BND1, so it is not deducted',
          'CIPM1: billed 250 m, both-sides, occupies 250 m of boundary. Can share with BND1, so it is not deducted'
        ]
      },
      {
        title: 'Stacks',
        content: [
          'Stack 1: CHRW2 + BND2 + CHRW1 (250 m)',
          'Stack 2: FG2 (100 m)',
          'Stack 3: BE1 (100 m)',
          'CHRW2, FG2 and BE1 cannot share a stretch with each other'
        ]
      },
      {
        title: 'Result',
        content: [
          'Boundary occupied by incompatible actions: 250 + 100 + 100 = 450 m',
          'Free boundary: 991 m',
          'Maximum available length for BND1: 991 m'
        ]
      }
    ])
  })

  it('places an action that is longer than any one stack it shares with across each of them', () => {
    // X (300 m) cannot share with BND1 but can share with both A (250 m) and B (100 m), which cannot share with each other
    const availableLength = calculateAvailableLength(
      'BND1',
      [existing('A', 250), existing('B', 100), existing('X', 300)],
      parcel({ compatibilityCheckFn: compatibleOnly(['X', 'A'], ['X', 'B']) })
    )

    const sections = formatLengthExplanationSections(availableLength, {
      targetAction: 'BND1',
      targetSidedness: 'both-sides'
    })

    expect(sections.slice(2, 4)).toEqual([
      {
        title: 'Existing actions on the boundary',
        content: [
          'A: billed 250 m, both-sides, occupies 250 m of boundary. Cannot share with BND1, so it is deducted',
          'B: billed 100 m, both-sides, occupies 100 m of boundary. Cannot share with BND1, so it is deducted',
          'X: billed 300 m, both-sides, occupies 300 m of boundary. Cannot share with BND1, but shares a stretch with A and B, which are already deducted'
        ]
      },
      {
        title: 'Stacks',
        content: [
          'Stack 1: A + X (250 m)',
          'Stack 2: B + X (100 m)',
          'A and B cannot share a stretch with each other'
        ]
      }
    ])
  })

  it('explains an action that stacks on another when the existing actions do not fit', () => {
    // BND1 (1200 m) cannot fit; CHRW2 shares its stretch with BND2 so is not counted again
    const availableLength = calculateAvailableLength(
      'WBD2',
      [existing('BND1', 1200), existing('BND2', 400), existing('CHRW2', 200)],
      parcel()
    )

    const sections = formatLengthExplanationSections(availableLength, {
      targetAction: 'WBD2',
      targetSidedness: LINEAR_SIDEDNESS.WBD2
    })

    expect(sections.slice(2, 4)).toEqual([
      {
        title: 'Existing actions on the boundary',
        content: [
          'BND1: billed 1200 m, both-sides, occupies 1200 m of boundary. Counted in the boundary the existing actions need',
          'BND2: billed 400 m, single-side, occupies 200 m of boundary. Counted in the boundary the existing actions need',
          'CHRW2: billed 200 m, single-side, occupies 100 m of boundary. Shares a stretch with BND2, so it is not counted again'
        ]
      },
      {
        title: 'Stacks',
        content: [
          'Stack 1: BND1 (1200 m)',
          'Stack 2: BND2 + CHRW2 (200 m)',
          'BND1 and BND2 cannot share a stretch with each other'
        ]
      }
    ])
  })
})
