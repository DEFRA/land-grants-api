/* eslint-disable no-console */
import { connectToTestDatbase } from '~/src/db-tests/setup/postgres.js'
import {
  getAvailableAreaDataRequirements,
  getAvailableAreaForAction
} from '../available-area/availableArea.js'
import { createCompatibilityMatrix } from '../available-area/compatibilityMatrix.js'
import { getAvailableAreaFixtures } from './setup/getAvailableAreaFixtures.js'

describe('Calculate available area', () => {
  let logger, connection
  const fixtures = getAvailableAreaFixtures()

  beforeAll(() => {
    logger = {
      log: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      error: vi.fn()
    }
    connection = connectToTestDatbase()
  })

  afterAll(async () => {
    await connection.end()
  })

  test.each(fixtures)(
    `%p`,
    async (
      name,
      {
        applyingForAction,
        sheetId,
        parcelId,
        existingActions: existingActionsStr,
        expectedAvailableArea
      }
    ) => {
      let existingActions = []
      try {
        existingActions = JSON.parse(existingActionsStr)
      } catch (e) {
        logger.error(
          `Error parsing existing actions in CSV file for parcelId ${parcelId}, sheetId ${sheetId}`
        )
      }

      const compatibilityCheckFn = await createCompatibilityMatrix(
        logger,
        connection,
        [
          'CMOR1',
          'UPL1',
          'UPL2',
          'UPL3',
          'SAM1',
          'SPM4',
          'OFM1',
          'OFM2',
          'OFM3',
          'SP1',
          'WS1',
          'WS2',
          'CAHL3',
          'CHRW1',
          'CHRW2',
          'CHRW3',
          'PRF1',
          'PRF2',
          'GRH6',
          'GRH7'
        ]
      )

      const aacDataRequirements = await getAvailableAreaDataRequirements(
        applyingForAction,
        sheetId,
        parcelId,
        existingActions,
        connection,
        logger
      )

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
