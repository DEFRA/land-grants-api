import { findMaximumAvailableArea } from './availableArea.lp.js'
import { getAvailableAreaComputedFixtures } from '../../tests/db-tests/setup/getAvailableAreaFixtures.js'

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
        landCoverToString: () => 'Faked land cover'
      }

      // call available area lp function with pre-computed data
      const result = findMaximumAvailableArea(
        applyingForAction,
        existingActions,
        compatibilityCheckFn,
        aacDataRequirements
      )
      console.log(`Tested scenario: ${name}`)
      expect(result.availableAreaHectares).toEqual(
        Number(expectedAvailableArea)
      )
    }
  )
})
