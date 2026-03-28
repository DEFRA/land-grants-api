import { formatExplanationSections } from './explanations.lp.js'

const landCoverToString = (code) => {
  const names = {
    130: 'Grassland (130)',
    240: 'Woodland (240)',
    110: 'Arable (110)'
  }
  return names[code] ?? `Unknown (${code})`
}

describe('formatExplanationSections', () => {
  describe('doc example: CMOR1/AA1/AA2', () => {
    // Grassland 3.1ha, Woodland 2.5ha, Arable 1ha
    // AA1 → Arable(1ha) + Woodland(1.5ha), AA2 → Woodland(1ha) + Grassland(2ha)
    // Available for CMOR1: 1.1ha on Grassland

    const landCoversForParcel = [
      { landCoverClassCode: '130', landCoverCode: '130', areaSqm: 31000 },
      { landCoverClassCode: '240', landCoverCode: '240', areaSqm: 25000 },
      { landCoverClassCode: '110', landCoverCode: '110', areaSqm: 10000 }
    ]

    const explanations = {
      eligibility: {
        CMOR1: [
          { landCoverIndex: 0, landCoverClassCode: '130', areaSqm: 31000 }
        ],
        AA1: [
          { landCoverIndex: 1, landCoverClassCode: '240', areaSqm: 25000 },
          { landCoverIndex: 2, landCoverClassCode: '110', areaSqm: 10000 }
        ],
        AA2: [
          { landCoverIndex: 1, landCoverClassCode: '240', areaSqm: 25000 },
          { landCoverIndex: 0, landCoverClassCode: '130', areaSqm: 31000 }
        ]
      },
      adjustedActions: [
        {
          actionCode: 'AA1',
          originalAreaSqm: 25000,
          adjustedAreaSqm: 25000,
          wasCapped: false,
          wasExcluded: false
        },
        {
          actionCode: 'AA2',
          originalAreaSqm: 30000,
          adjustedAreaSqm: 30000,
          wasCapped: false,
          wasExcluded: false
        }
      ],
      incompatibilityCliques: [['CMOR1', 'AA1', 'AA2']],
      allocations: [
        { actionCode: 'AA1', landCoverIndex: 2, areaSqm: 10000 },
        { actionCode: 'AA1', landCoverIndex: 1, areaSqm: 15000 },
        { actionCode: 'AA2', landCoverIndex: 1, areaSqm: 10000 },
        { actionCode: 'AA2', landCoverIndex: 0, areaSqm: 20000 }
      ],
      targetAvailability: [
        {
          landCoverIndex: 0,
          totalAreaSqm: 31000,
          usedByExistingSqm: 20000,
          availableSqm: 11000
        }
      ],
      stacks: [
        {
          stackNumber: 1,
          actionCodes: ['AA1'],
          areaSqm: 10000,
          landCoverIndex: 2
        },
        {
          stackNumber: 2,
          actionCodes: ['AA1'],
          areaSqm: 15000,
          landCoverIndex: 1
        },
        {
          stackNumber: 3,
          actionCodes: ['AA2'],
          areaSqm: 10000,
          landCoverIndex: 1
        },
        {
          stackNumber: 4,
          actionCodes: ['AA2'],
          areaSqm: 20000,
          landCoverIndex: 0
        }
      ]
    }

    const context = {
      targetAction: 'CMOR1',
      availableAreaSqm: 11000,
      totalValidLandCoverSqm: 31000,
      landCoversForParcel,
      landCoverToString
    }

    let sections

    beforeAll(() => {
      sections = formatExplanationSections(explanations, context)
    })

    it('returns an array of ExplanationSection objects', () => {
      for (const section of sections) {
        expect(section).toHaveProperty('title')
        expect(section).toHaveProperty('content')
        expect(typeof section.title).toBe('string')
        expect(Array.isArray(section.content)).toBe(true)
        for (const line of section.content) {
          expect(typeof line).toBe('string')
        }
      }
    })

    it('includes an eligibility section with land cover descriptions', () => {
      const section = sections.find(
        (s) => s.title === 'Eligible land covers per action'
      )
      expect(section).toBeDefined()
      expect(section.content).toContainEqual(expect.stringContaining('CMOR1'))
      expect(section.content).toContainEqual(
        expect.stringContaining('Grassland (130)')
      )
      expect(section.content).toContainEqual(expect.stringContaining('AA1'))
      expect(section.content).toContainEqual(
        expect.stringContaining('Woodland (240)')
      )
    })

    it('includes an adjusted actions section', () => {
      const section = sections.find(
        (s) => s.title === 'Existing action adjustments'
      )
      expect(section).toBeDefined()
      expect(section.content).toEqual([
        'AA1: 2.5 ha (no adjustment needed)',
        'AA2: 3 ha (no adjustment needed)'
      ])
    })

    it('includes an incompatibility section', () => {
      const section = sections.find(
        (s) => s.title === 'Incompatible action groups'
      )
      expect(section).toBeDefined()
      expect(section.content).toEqual([
        'CMOR1, AA1, AA2 cannot share the same land'
      ])
    })

    it('includes an allocations section showing how existing actions were placed', () => {
      const section = sections.find(
        (s) => s.title === 'Optimal placement of existing actions'
      )
      expect(section).toBeDefined()
      // AA1 placed on Arable + Woodland
      const aa1Line = section.content.find((l) => l.startsWith('AA1:'))
      expect(aa1Line).toContain('Arable (110)')
      expect(aa1Line).toContain('Woodland (240)')
      // AA2 placed on Woodland + Grassland
      const aa2Line = section.content.find((l) => l.startsWith('AA2:'))
      expect(aa2Line).toContain('Woodland (240)')
      expect(aa2Line).toContain('Grassland (130)')
    })

    it('includes a target availability section', () => {
      const section = sections.find(
        (s) => s.title === 'Available land for CMOR1'
      )
      expect(section).toBeDefined()
      expect(section.content).toEqual([
        'Grassland (130): 3.1 ha total, 2 ha used by existing actions, 1.1 ha available'
      ])
    })

    it('includes a result section', () => {
      const section = sections.find((s) => s.title === 'Result')
      expect(section).toBeDefined()
      expect(section.content).toEqual([
        'Total eligible land cover for CMOR1: 3.1 ha',
        'Maximum available area for CMOR1: 1.1 ha'
      ])
    })

    it('includes a stacks section with land cover names', () => {
      const section = sections.find((s) => s.title === 'Ephemeral stacks')
      expect(section).toBeDefined()
      expect(section.content).toContainEqual(
        'Stack 1: AA1 on Arable (110) (1 ha)'
      )
      expect(section.content).toContainEqual(
        'Stack 4: AA2 on Grassland (130) (2 ha)'
      )
    })
  })

  describe('no existing actions', () => {
    it('shows full area available with no allocations or stacks sections', () => {
      const sections = formatExplanationSections(
        {
          eligibility: {
            TARGET: [
              { landCoverIndex: 0, landCoverClassCode: '130', areaSqm: 50000 }
            ]
          },
          adjustedActions: [],
          incompatibilityCliques: [],
          allocations: [],
          targetAvailability: [
            {
              landCoverIndex: 0,
              totalAreaSqm: 50000,
              usedByExistingSqm: 0,
              availableSqm: 50000
            }
          ],
          stacks: []
        },
        {
          targetAction: 'TARGET',
          availableAreaSqm: 50000,
          totalValidLandCoverSqm: 50000,
          landCoversForParcel: [
            {
              landCoverClassCode: '130',
              landCoverCode: '130',
              areaSqm: 50000
            }
          ],
          landCoverToString
        }
      )

      // Should not have adjusted actions, incompatibility, allocations, or stacks sections
      expect(
        sections.find((s) => s.title === 'Existing action adjustments')
      ).toBeUndefined()
      expect(
        sections.find((s) => s.title === 'Incompatible action groups')
      ).toBeUndefined()
      expect(
        sections.find(
          (s) => s.title === 'Optimal placement of existing actions'
        )
      ).toBeUndefined()
      expect(
        sections.find((s) => s.title === 'Ephemeral stacks')
      ).toBeUndefined()

      // Should have eligibility, target availability, and result
      expect(
        sections.find((s) => s.title === 'Eligible land covers per action')
      ).toBeDefined()

      const result = sections.find((s) => s.title === 'Result')
      expect(result.content).toContainEqual(
        'Maximum available area for TARGET: 5 ha'
      )
    })
  })

  describe('capped and excluded actions', () => {
    it('shows capped and excluded actions with appropriate messages', () => {
      const sections = formatExplanationSections(
        {
          eligibility: {
            TARGET: [
              { landCoverIndex: 0, landCoverClassCode: '130', areaSqm: 50000 }
            ]
          },
          adjustedActions: [
            {
              actionCode: 'BIG',
              originalAreaSqm: 100000,
              adjustedAreaSqm: 20000,
              wasCapped: true,
              wasExcluded: false
            },
            {
              actionCode: 'NONE',
              originalAreaSqm: 10000,
              adjustedAreaSqm: 0,
              wasCapped: false,
              wasExcluded: true
            }
          ],
          incompatibilityCliques: [],
          allocations: [],
          targetAvailability: [
            {
              landCoverIndex: 0,
              totalAreaSqm: 50000,
              usedByExistingSqm: 0,
              availableSqm: 50000
            }
          ],
          stacks: []
        },
        {
          targetAction: 'TARGET',
          availableAreaSqm: 50000,
          totalValidLandCoverSqm: 50000,
          landCoversForParcel: [
            {
              landCoverClassCode: '130',
              landCoverCode: '130',
              areaSqm: 50000
            }
          ],
          landCoverToString
        }
      )

      const section = sections.find(
        (s) => s.title === 'Existing action adjustments'
      )
      expect(section).toBeDefined()
      expect(section.content[0]).toBe(
        'BIG: area capped from 10 ha to 2 ha (limited by available land cover)'
      )
      expect(section.content[1]).toBe(
        'NONE: excluded (no eligible land covers on parcel)'
      )
    })
  })

  describe('multiple target land covers', () => {
    it('shows per-land-cover breakdown in target availability', () => {
      const sections = formatExplanationSections(
        {
          eligibility: {
            TARGET: [
              { landCoverIndex: 0, landCoverClassCode: '130', areaSqm: 30000 },
              { landCoverIndex: 1, landCoverClassCode: '110', areaSqm: 20000 }
            ]
          },
          adjustedActions: [],
          incompatibilityCliques: [],
          allocations: [],
          targetAvailability: [
            {
              landCoverIndex: 0,
              totalAreaSqm: 30000,
              usedByExistingSqm: 10000,
              availableSqm: 20000
            },
            {
              landCoverIndex: 1,
              totalAreaSqm: 20000,
              usedByExistingSqm: 5000,
              availableSqm: 15000
            }
          ],
          stacks: []
        },
        {
          targetAction: 'TARGET',
          availableAreaSqm: 35000,
          totalValidLandCoverSqm: 50000,
          landCoversForParcel: [
            {
              landCoverClassCode: '130',
              landCoverCode: '130',
              areaSqm: 30000
            },
            {
              landCoverClassCode: '110',
              landCoverCode: '110',
              areaSqm: 20000
            }
          ],
          landCoverToString
        }
      )

      const section = sections.find(
        (s) => s.title === 'Available land for TARGET'
      )
      expect(section.content).toEqual([
        'Grassland (130): 3 ha total, 1 ha used by existing actions, 2 ha available',
        'Arable (110): 2 ha total, 0.5 ha used by existing actions, 1.5 ha available'
      ])
    })
  })
})
