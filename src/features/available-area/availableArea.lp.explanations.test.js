import { findMaximumAvailableArea } from './availableArea.lp.js'
import { makeCompatibilityCheckFn } from './testUtils.js'

/**
 * Helper to create land cover codes entries for an action.
 * @param {string[]} classCodes - land cover class codes the action is eligible for
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
    landCoverToString: (code) => `LC-${code}`
  }
}

describe('AAC LP explanations - secondary outputs', () => {
  describe('no existing actions', () => {
    it('returns eligibility and targetAvailability showing full area available', () => {
      const result = findMaximumAvailableArea(
        'TARGET',
        [],
        makeCompatibilityCheckFn({}),
        makeDataRequirements({
          targetCodes: ['130'],
          parcelLandCovers: [
            { landCoverClassCode: '130', landCoverCode: '130', areaSqm: 50000 }
          ],
          existingActionCodes: {}
        })
      )

      expect(result.explanations.eligibility).toEqual({
        TARGET: [
          { landCoverIndex: 0, landCoverClassCode: '130', areaSqm: 50000 }
        ]
      })
      expect(result.explanations.allocations).toEqual([])
      expect(result.explanations.adjustedActions).toEqual([])
      expect(result.explanations.targetAvailability).toEqual([
        {
          landCoverIndex: 0,
          totalAreaSqm: 50000,
          usedByExistingSqm: 0,
          availableSqm: 50000
        }
      ])
    })
  })

  describe('doc example: CMOR1/AA1/AA2 with Grassland/Woodland/Arable', () => {
    // From docs/available-area-calculation.md section 5
    // CMOR1 eligible: Grassland (130)
    // AA1 eligible: Woodland (240), Arable (110)
    // AA2 eligible: Woodland (240), Grassland (130)
    // None compatible. Parcel: Grassland 3.1ha, Woodland 2.5ha, Arable 1ha
    // Optimal: AA1 → Arable(1ha) + Woodland(1.5ha), AA2 → Woodland(1ha) + Grassland(2ha)
    // Available for CMOR1: 3.1 - 2 = 1.1ha

    let result

    beforeAll(() => {
      result = findMaximumAvailableArea(
        'CMOR1',
        [
          { actionCode: 'AA1', areaSqm: 25000 },
          { actionCode: 'AA2', areaSqm: 30000 }
        ],
        makeCompatibilityCheckFn({
          // None are compatible with each other
        }),
        makeDataRequirements({
          targetCodes: ['130'],
          parcelLandCovers: [
            {
              landCoverClassCode: '130',
              landCoverCode: '130',
              areaSqm: 31000
            }, // Grassland
            {
              landCoverClassCode: '240',
              landCoverCode: '240',
              areaSqm: 25000
            }, // Woodland
            {
              landCoverClassCode: '110',
              landCoverCode: '110',
              areaSqm: 10000
            } // Arable
          ],
          existingActionCodes: {
            AA1: ['240', '110'],
            AA2: ['240', '130']
          }
        })
      )
    })

    it('calculates 1.1 ha available', () => {
      expect(result.availableAreaHectares).toBe(1.1)
    })

    it('shows eligibility for all actions', () => {
      const { eligibility } = result.explanations

      expect(eligibility.CMOR1).toEqual([
        { landCoverIndex: 0, landCoverClassCode: '130', areaSqm: 31000 }
      ])
      expect(eligibility.AA1).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ landCoverClassCode: '240' }),
          expect.objectContaining({ landCoverClassCode: '110' })
        ])
      )
      expect(eligibility.AA2).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ landCoverClassCode: '240' }),
          expect.objectContaining({ landCoverClassCode: '130' })
        ])
      )
    })

    it('shows no actions were adjusted', () => {
      expect(result.explanations.adjustedActions).toEqual([
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
      ])
    })

    it('shows incompatibility cliques', () => {
      // All three are mutually incompatible, so there should be a clique containing all
      const cliques = result.explanations.incompatibilityCliques
      expect(cliques.length).toBeGreaterThanOrEqual(1)
      const largestClique = cliques.reduce(
        (a, b) => (a.length >= b.length ? a : b),
        []
      )
      expect(largestClique).toEqual(
        expect.arrayContaining(['CMOR1', 'AA1', 'AA2'])
      )
    })

    it('shows allocations that place AA1 on Arable+Woodland and AA2 on Woodland+Grassland', () => {
      const { allocations } = result.explanations

      // AA1 total allocation should equal 25000
      const aa1Allocations = allocations.filter((a) => a.actionCode === 'AA1')
      const aa1Total = aa1Allocations.reduce((sum, a) => sum + a.areaSqm, 0)
      expect(aa1Total).toBeCloseTo(25000, 0)

      // AA2 total allocation should equal 30000
      const aa2Allocations = allocations.filter((a) => a.actionCode === 'AA2')
      const aa2Total = aa2Allocations.reduce((sum, a) => sum + a.areaSqm, 0)
      expect(aa2Total).toBeCloseTo(30000, 0)

      // AA1 should use Arable (index 2) to its full 10000
      const aa1Arable = aa1Allocations.find((a) => a.landCoverIndex === 2)
      expect(aa1Arable).toBeDefined()
      expect(aa1Arable.areaSqm).toBeCloseTo(10000, 0)
    })

    it('shows target availability on Grassland with 11000 sqm available', () => {
      const { targetAvailability } = result.explanations

      expect(targetAvailability).toEqual([
        {
          landCoverIndex: 0,
          totalAreaSqm: 31000,
          usedByExistingSqm: 20000,
          availableSqm: 11000
        }
      ])
    })
  })

  describe('capped demand', () => {
    it('flags wasCapped when action area exceeds eligible land cover', () => {
      const result = findMaximumAvailableArea(
        'TARGET',
        [{ actionCode: 'BIG', areaSqm: 100000 }],
        makeCompatibilityCheckFn({}),
        makeDataRequirements({
          targetCodes: ['130'],
          parcelLandCovers: [
            {
              landCoverClassCode: '130',
              landCoverCode: '130',
              areaSqm: 50000
            },
            {
              landCoverClassCode: '110',
              landCoverCode: '110',
              areaSqm: 20000
            }
          ],
          existingActionCodes: {
            BIG: ['110'] // Only eligible for 20000 sqm of Arable
          }
        })
      )

      expect(result.explanations.adjustedActions).toEqual([
        {
          actionCode: 'BIG',
          originalAreaSqm: 100000,
          adjustedAreaSqm: 20000,
          wasCapped: true,
          wasExcluded: false
        }
      ])
      // Target gets full Grassland since BIG is only on Arable
      expect(result.availableAreaSqm).toBe(50000)
    })
  })

  describe('excluded action', () => {
    it('flags wasExcluded when action has no eligible land covers', () => {
      const result = findMaximumAvailableArea(
        'TARGET',
        [{ actionCode: 'NONE', areaSqm: 10000 }],
        makeCompatibilityCheckFn({}),
        makeDataRequirements({
          targetCodes: ['130'],
          parcelLandCovers: [
            { landCoverClassCode: '130', landCoverCode: '130', areaSqm: 50000 }
          ],
          existingActionCodes: {
            NONE: ['999'] // No matching land cover on parcel
          }
        })
      )

      expect(result.explanations.adjustedActions).toEqual([
        {
          actionCode: 'NONE',
          originalAreaSqm: 10000,
          adjustedAreaSqm: 0,
          wasCapped: false,
          wasExcluded: true
        }
      ])
      expect(result.explanations.allocations).toEqual([])
    })
  })

  describe('compatible actions stacking', () => {
    it('shows compatible actions sharing land cover without reducing target availability', () => {
      // Two compatible actions on the same land cover as target
      // They stack, so they use max(area) not sum(area) of shared space
      const result = findMaximumAvailableArea(
        'TARGET',
        [
          { actionCode: 'C1', areaSqm: 20000 },
          { actionCode: 'C2', areaSqm: 15000 }
        ],
        makeCompatibilityCheckFn({
          TARGET: ['C1', 'C2'],
          C1: ['C2', 'TARGET'],
          C2: ['C1', 'TARGET']
        }),
        makeDataRequirements({
          targetCodes: ['130'],
          parcelLandCovers: [
            { landCoverClassCode: '130', landCoverCode: '130', areaSqm: 50000 }
          ],
          existingActionCodes: {
            C1: ['130'],
            C2: ['130']
          }
        })
      )

      // All compatible with target, so full area available
      expect(result.availableAreaSqm).toBe(50000)

      // Stacks should group compatible actions together with landCoverIndex
      for (const stack of result.explanations.stacks) {
        expect(stack).toHaveProperty('landCoverIndex')
        expect(typeof stack.landCoverIndex).toBe('number')
      }
    })
  })

  describe('enhanced stacks', () => {
    it('includes landCoverIndex on each stack', () => {
      const result = findMaximumAvailableArea(
        'TARGET',
        [{ actionCode: 'EX1', areaSqm: 10000 }],
        makeCompatibilityCheckFn({}),
        makeDataRequirements({
          targetCodes: ['130'],
          parcelLandCovers: [
            {
              landCoverClassCode: '130',
              landCoverCode: '130',
              areaSqm: 50000
            },
            {
              landCoverClassCode: '110',
              landCoverCode: '110',
              areaSqm: 20000
            }
          ],
          existingActionCodes: {
            EX1: ['110']
          }
        })
      )

      expect(result.explanations.stacks.length).toBeGreaterThan(0)
      for (const stack of result.explanations.stacks) {
        expect(stack).toHaveProperty('landCoverIndex')
        expect(stack.landCoverIndex).toBe(1) // index of Arable (110)
      }
    })
  })
})
