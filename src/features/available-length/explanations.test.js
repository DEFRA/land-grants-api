import { calculateAvailableLength } from './availableLength.js'
import { formatLengthExplanationSections } from './explanations.js'
import { LINEAR_SIDEDNESS, existing, parcel } from './testUtils.js'

describe('formatLengthExplanationSections', () => {
  it('lists each existing action with the boundary it occupies and whether it was deducted', () => {
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
          'CHRW2: billed 400 m, single-side, occupies 200 m of boundary, not deducted',
          'BND1: billed 200 m, both-sides, occupies 200 m of boundary, deducted'
        ]
      },
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
          'BND2: billed 1000 m, single-side, occupies 500 m of boundary, deducted'
        ]
      },
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
          'BND1: billed 1200 m, both-sides, occupies 1200 m of boundary, deducted'
        ]
      },
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
})
