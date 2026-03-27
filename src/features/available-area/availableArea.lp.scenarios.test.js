import { findMaximumAvailableArea } from './availableArea.lp.js'
import { getAvailableAreaComputedFixtures } from '../../tests/db-tests/setup/getAvailableAreaFixtures.js'

describe('Available Area Calculation Service - Scenario Tests (Optimized)', () => {
  let logger
  const fixtures = getAvailableAreaComputedFixtures()

  beforeAll(() => {
    logger = {
      log: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      error: vi.fn()
    }
  })

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

      expect(result.availableAreaHectares).toEqual(
        Number(expectedAvailableArea)
      )
    }
  )
})
