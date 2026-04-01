import { findMaximumAvailableArea } from './availableArea.lp.js'
import { getAvailableAreaComputedFixtures } from '../../tests/db-tests/setup/getAvailableAreaFixtures.js'
import { landCoverToString } from './testLandCoverToString.js'
import { formatExplanationSections } from './explanations.lp.js'

describe('Available Area Calculation Service - Scenario Tests (Optimized)', () => {
  const fixtures = getAvailableAreaComputedFixtures()

  test.each(fixtures)(
    `%p`,
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
        landCoverToString
      })

      console.log('Explanation Sections:', JSON.stringify(sections, null, 2))
      if (expectedAvailableArea === 'INFEASIBLE') {
        expect(result.feasible).toBe(false)
      } else {
        expect(result.availableAreaHectares).toEqual(
          Number(expectedAvailableArea)
        )
      }
    }
  )
})
