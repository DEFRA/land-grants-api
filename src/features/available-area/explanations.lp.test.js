import { findMaximumAvailableArea } from './availableArea.lp.js'
import { formatExplanationSections } from './explanations.lp.js'
import { makeCompatibilityCheckFn } from './testUtils.js'
import { landCoverToString } from './testLandCoverToString.js'

/**
 * Helper to create land cover codes entries for an action.
 * @param {string[]} classCodes
 * @returns {Array<{landCoverClassCode: string, landCoverCode: string}>}
 */
function makeLandCoverCodes(classCodes) {
  return classCodes.map((code) => ({
    landCoverClassCode: code,
    landCoverCode: code
  }))
}

/**
 * Helper to build dataRequirements for a test scenario.
 */
function makeDataRequirements({
  targetCodes,
  parcelLandCovers,
  existingActionCodes
}) {
  return {
    landCoverCodesForAppliedForAction: makeLandCoverCodes(targetCodes),
    landCoversForParcel: parcelLandCovers,
    landCoversForExistingActions: Object.fromEntries(
      Object.entries(existingActionCodes).map(([code, classCodes]) => [
        code,
        makeLandCoverCodes(classCodes)
      ])
    ),
    landCoverToString
  }
}

/**
 * Helper to run findMaximumAvailableArea and formatExplanationSections end-to-end.
 */
function runAndFormat({
  applyingForAction,
  existingActions,
  compatibilityMap,
  targetCodes,
  parcelLandCovers,
  existingActionCodes
}) {
  const result = findMaximumAvailableArea(
    applyingForAction,
    existingActions,
    makeCompatibilityCheckFn(compatibilityMap),
    makeDataRequirements({ targetCodes, parcelLandCovers, existingActionCodes })
  )

  const sections = formatExplanationSections(result.context, {
    targetAction: applyingForAction,
    availableAreaSqm: result.availableAreaSqm,
    totalValidLandCoverSqm: result.totalValidLandCoverSqm,
    landCoverToString
  })

  return { result, sections }
}

describe('formatExplanationSections', () => {
  describe('doc example: CMOR1/AA1/AA2', () => {
    let sections

    beforeAll(() => {
      ;({ sections } = runAndFormat({
        applyingForAction: 'CMOR1',
        existingActions: [
          { actionCode: 'AA1', areaSqm: 25000 },
          { actionCode: 'AA2', areaSqm: 30000 }
        ],
        compatibilityMap: {},
        targetCodes: ['130'],
        parcelLandCovers: [
          { landCoverClassCode: '130', landCoverCode: '130', areaSqm: 31000 },
          { landCoverClassCode: '240', landCoverCode: '240', areaSqm: 25000 },
          { landCoverClassCode: '110', landCoverCode: '110', areaSqm: 10000 }
        ],
        existingActionCodes: {
          AA1: ['240', '110'],
          AA2: ['240', '130']
        }
      }))
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
        expect.stringContaining('Permanent grassland (130)')
      )
      expect(section.content).toContainEqual(expect.stringContaining('AA1'))
      expect(section.content).toContainEqual(
        expect.stringContaining('Water/irrigation features (240)')
      )
    })

    it('includes an adjusted actions section', () => {
      const section = sections.find((s) => s.title === 'Existing actions')
      expect(section).toBeDefined()
      expect(section.content).toEqual(['AA1: 2.5 ha', 'AA2: 3 ha'])
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
      const aa1Line = section.content.find((l) => l.startsWith('AA1:'))
      expect(aa1Line).toContain('Half Hedge Adjacent NON-EFA (110)')
      expect(aa1Line).toContain('Water/irrigation features (240)')
      const aa2Line = section.content.find((l) => l.startsWith('AA2:'))
      expect(aa2Line).toContain('Water/irrigation features (240)')
      expect(aa2Line).toContain('Permanent grassland (130)')
    })

    it('includes a target availability section', () => {
      const section = sections.find(
        (s) => s.title === 'Available land for CMOR1'
      )
      expect(section).toBeDefined()
      expect(section.content).toEqual([
        'Permanent grassland (130): 3.1 ha total, 2 ha used by existing actions, 1.1 ha available'
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
        expect.stringContaining(
          'AA1 on Half Hedge Adjacent NON-EFA (110) (1 ha)'
        )
      )
      expect(section.content).toContainEqual(
        expect.stringContaining('AA2 on Permanent grassland (130) (2 ha)')
      )
    })
  })

  describe('no existing actions', () => {
    it('shows full area available with no allocations or stacks sections', () => {
      const { sections } = runAndFormat({
        applyingForAction: 'TARGET',
        existingActions: [],
        compatibilityMap: {},
        targetCodes: ['130'],
        parcelLandCovers: [
          { landCoverClassCode: '130', landCoverCode: '130', areaSqm: 50000 }
        ],
        existingActionCodes: {}
      })

      expect(
        sections.find((s) => s.title === 'Existing actions')
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
      const { sections } = runAndFormat({
        applyingForAction: 'TARGET',
        existingActions: [
          { actionCode: 'BIG', areaSqm: 100000 },
          { actionCode: 'NONE', areaSqm: 10000 }
        ],
        compatibilityMap: {},
        targetCodes: ['130'],
        parcelLandCovers: [
          { landCoverClassCode: '130', landCoverCode: '130', areaSqm: 50000 },
          { landCoverClassCode: '110', landCoverCode: '110', areaSqm: 20000 }
        ],
        existingActionCodes: {
          BIG: ['110'],
          NONE: ['999']
        }
      })

      const section = sections.find((s) => s.title === 'Existing actions')
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
      const { sections } = runAndFormat({
        applyingForAction: 'TARGET',
        existingActions: [{ actionCode: 'EX1', areaSqm: 15000 }],
        compatibilityMap: {},
        targetCodes: ['130', '110'],
        parcelLandCovers: [
          { landCoverClassCode: '130', landCoverCode: '130', areaSqm: 30000 },
          { landCoverClassCode: '110', landCoverCode: '110', areaSqm: 20000 }
        ],
        existingActionCodes: {
          EX1: ['130', '110']
        }
      })

      const section = sections.find(
        (s) => s.title === 'Available land for TARGET'
      )
      expect(section).toBeDefined()
      // The LP will optimally place EX1 to maximize target availability
      // Total target availability should be 50000 - 15000 = 35000
      const totalAvailable = section.content.reduce((sum, line) => {
        const match = line.match(/([\d.]+) ha available/)
        return sum + (match ? Number.parseFloat(match[1]) : 0)
      }, 0)
      expect(totalAvailable).toBeCloseTo(3.5, 1)
    })
  })

  describe('null context (no eligible land covers)', () => {
    it('returns only a result section', () => {
      const result = findMaximumAvailableArea(
        'TARGET',
        [],
        makeCompatibilityCheckFn({}),
        makeDataRequirements({
          targetCodes: ['999'],
          parcelLandCovers: [
            { landCoverClassCode: '130', landCoverCode: '130', areaSqm: 50000 }
          ],
          existingActionCodes: {}
        })
      )

      const sections = formatExplanationSections(result.context, {
        targetAction: 'TARGET',
        availableAreaSqm: 0,
        totalValidLandCoverSqm: 0,
        landCoverToString
      })

      expect(sections).toHaveLength(1)
      expect(sections[0].title).toBe('Result')
      expect(sections[0].content).toContainEqual(
        'Maximum available area for TARGET: 0 ha'
      )
    })
  })

  describe('compatible actions stacking', () => {
    it('shows compatible actions sharing land cover without reducing target availability', () => {
      const { result, sections } = runAndFormat({
        applyingForAction: 'TARGET',
        existingActions: [
          { actionCode: 'C1', areaSqm: 20000 },
          { actionCode: 'C2', areaSqm: 15000 }
        ],
        compatibilityMap: {
          TARGET: ['C1', 'C2'],
          C1: ['C2', 'TARGET'],
          C2: ['C1', 'TARGET']
        },
        targetCodes: ['130'],
        parcelLandCovers: [
          { landCoverClassCode: '130', landCoverCode: '130', areaSqm: 50000 }
        ],
        existingActionCodes: {
          C1: ['130'],
          C2: ['130']
        }
      })

      // All compatible with target, so full area available
      expect(result.availableAreaSqm).toBe(50000)

      // Stacks section should exist and reference land covers
      const stackSection = sections.find((s) => s.title === 'Ephemeral stacks')
      expect(stackSection).toBeDefined()
      for (const line of stackSection.content) {
        expect(line).toContain('Permanent grassland (130)')
      }
    })
  })

  describe('enhanced stacks with land cover info', () => {
    it('includes land cover names in stack descriptions', () => {
      const { sections } = runAndFormat({
        applyingForAction: 'TARGET',
        existingActions: [{ actionCode: 'EX1', areaSqm: 10000 }],
        compatibilityMap: {},
        targetCodes: ['130'],
        parcelLandCovers: [
          { landCoverClassCode: '130', landCoverCode: '130', areaSqm: 50000 },
          { landCoverClassCode: '110', landCoverCode: '110', areaSqm: 20000 }
        ],
        existingActionCodes: {
          EX1: ['110']
        }
      })

      const stackSection = sections.find((s) => s.title === 'Ephemeral stacks')
      expect(stackSection).toBeDefined()
      expect(stackSection.content.length).toBeGreaterThan(0)
      // EX1 is placed on Half Hedge Adjacent NON-EFA (110)
      expect(stackSection.content[0]).toContain(
        'Half Hedge Adjacent NON-EFA (110)'
      )
    })
  })
})
