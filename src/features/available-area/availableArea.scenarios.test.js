import { getAvailableAreaForAction } from './availableArea.js'
import {
  getAvailableAreaComputedFixtures,
  createLandCoverToStringFromDefinitions
} from '../../tests/db-tests/setup/getAvailableAreaFixtures.js'

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
      {
        applyingForAction,
        sheetId,
        parcelId,
        existingActions,
        expectedAvailableArea
      },
      { compatibilityCheckFn, dataRequirements }
    ) => {
      // Create landCoverToString function from stored definitions
      const landCoverToString = createLandCoverToStringFromDefinitions(
        dataRequirements.landCoverDefinitions
      )

      // Recreate the aacDataRequirements object with the landCoverToString function
      const aacDataRequirements = {
        landCoverCodesForAppliedForAction:
          dataRequirements.landCoverCodesForAppliedForAction,
        landCoversForParcel: dataRequirements.landCoversForParcel,
        landCoversForExistingActions:
          dataRequirements.landCoversForExistingActions,
        landCoverToString
      }

      // This is now a pure calculation with no database I/O
      const result = getAvailableAreaForAction(
        applyingForAction,
        sheetId,
        parcelId,
        compatibilityCheckFn,
        existingActions,
        aacDataRequirements,
        logger
      )

      expect(result.availableAreaHectares).toEqual(
        Number(expectedAvailableArea)
      )
    }
  )
})
