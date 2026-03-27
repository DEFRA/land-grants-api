import { getAvailableAreaForAction } from './availableArea.js'
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
      {
        applyingForAction,
        sheetId,
        parcelId,
        existingActions,
        expectedAvailableArea
      },
      { compatibilityCheckFn, dataRequirements }
    ) => {
      const aacDataRequirements = {
        landCoverCodesForAppliedForAction:
          dataRequirements.landCoverCodesForAppliedForAction,
        landCoversForParcel: dataRequirements.landCoversForParcel,
        landCoversForExistingActions:
          dataRequirements.landCoversForExistingActions,
        landCoverToString: () => 'Faked land cover'
      }

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
