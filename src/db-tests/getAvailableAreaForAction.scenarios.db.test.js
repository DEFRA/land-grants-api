/* eslint-disable no-console */
import { connectToTestDatbase } from '~/src/db-tests/setup/postgres.js'
import {
  getAvailableAreaDataRequirements,
  getAvailableAreaForAction
} from '../available-area/availableArea.js'
import { createCompatibilityMatrix } from '../available-area/compatibilityMatrix.js'
import { getAvailableAreaFixtures } from './setup/getAvailableAreaFixtures.js'

const logger = {
  log: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn()
}

let connection

describe('Calculate available area', () => {
  const fixtures = getAvailableAreaFixtures()

  beforeAll(() => {
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

      // console.log(JSON.stringify(result.explanations, null, 2))
      // console.log(JSON.stringify(result.stacks, null, 2))

      expect(result.availableAreaHectares).toEqual(
        Number(expectedAvailableArea)
      )
    }
  )
})
