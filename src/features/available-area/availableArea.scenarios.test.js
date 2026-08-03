import { findMaximumAvailableArea } from './availableArea.js'
import { getAvailableAreaComputedFixtures } from '../../tests/db-tests/setup/getAvailableAreaFixtures.js'
import { landCoverToString } from './testLandCoverToString.js'
import { formatExplanationSections } from './explanations.js'

// These tests use scenarios from a fixture file (available-area-computed.json). This file is generated
// from availableAreaCalculationScenarios.csv, along with additional data retrieved from the test DB
describe('Available Area Calculation Service - Scenario Tests', () => {
  const fixtures = getAvailableAreaComputedFixtures()

  test.each(fixtures)(
    `%s`,
    (
      name,
      { applyingForAction, existingActions, expectedAvailableArea },
      { compatibilityCheckFn, dataRequirements }
    ) => {
      // Recreate the aacDataRequirements object with the pre-computed data
      const aacDataRequirements = {
        landCoverCodesForAppliedForAction:
          dataRequirements.landCoverCodesForAppliedForAction,
        landCoversForParcel: dataRequirements.landCoversForParcel,
        landCoversForExistingActions:
          dataRequirements.landCoversForExistingActions,
        sssiOverlap: dataRequirements.sssiOverlap,
        hfOverlap: dataRequirements.hfOverlap,
        sssiAndHfOverlap: dataRequirements.sssiAndHfOverlap,
        sssiActionEligibility: dataRequirements.sssiActionEligibility,
        hfActionEligibility: dataRequirements.hfActionEligibility,
        landCoverToString
      }

      // call available area lp function with pre-computed data
      const result = findMaximumAvailableArea(
        applyingForAction,
        existingActions,
        compatibilityCheckFn,
        aacDataRequirements
      )
      console.log(`Tested scenario: ${name}`)
      const sections = formatExplanationSections(result.context, {
        targetAction: applyingForAction,
        availableAreaSqm: result.availableAreaSqm,
        totalValidLandCoverSqm: result.totalValidLandCoverSqm,
        landCoverToString,
        feasible: result.feasible
      })

      expect(JSON.stringify(sections, null, 2)).toMatchSnapshot()

      if (expectedAvailableArea === 'INFEASIBLE') {
        expect(result.feasible).toBe(false)
      } else {
        expect(result.feasible).toBe(true)
        expect(result.availableAreaHectares).toEqual(
          Number(expectedAvailableArea)
        )
      }
    }
  )
})

describe('infeasible result context', () => {
  it('returns full context when existing action area exceeds eligible land cover', () => {
    const result = findMaximumAvailableArea(
      'TARGET',
      [{ actionCode: 'EXISTING', areaSqm: 15000 }],
      () => false,
      {
        landCoverCodesForAppliedForAction: [
          { landCoverCode: 'A', landCoverClassCode: 'A' }
        ],
        landCoversForParcel: [
          { landCoverClassCode: 'A', areaSqm: 10000 },
          { landCoverClassCode: 'B', areaSqm: 10000 }
        ],
        landCoversForExistingActions: {
          EXISTING: [{ landCoverCode: 'B', landCoverClassCode: 'B' }]
        },
        landCoverToString
      }
    )

    expect(result.feasible).toBe(false)
    expect(result.context).not.toBeNull()
    expect(result.context.existingActions).toEqual([
      { actionCode: 'EXISTING', areaSqm: 15000 }
    ])
    expect(result.context.eligibility).toBeInstanceOf(Map)
    expect(result.context.eligibility.has('EXISTING')).toBe(true)
    expect(result.context.eligibility.has('TARGET__target')).toBe(true)
    expect(result.context.cliques.length).toBeGreaterThan(0)
    expect(result.context.landCoversForParcel).toHaveLength(2)
    expect(result.totalValidLandCoverSqm).toBe(10000)
  })
})
