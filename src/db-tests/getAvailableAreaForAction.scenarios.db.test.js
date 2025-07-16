/* eslint-disable no-console */
import compatibilityMatrix from '~/src/api/common/helpers/seed-data/compatibility-matrix.js'
import compatibilityMatrixModel from '~/src/api/compatibility-matrix/models/compatibilityMatrix.model.js'
import {
  connectToTestDatbase,
  resetDatabase,
  seedPostgres
} from '~/src/db-tests/setup/postgres.js'
import {
  closeMongo,
  connectMongo,
  seedMongo
} from '~/src/db-tests/setup/utils.js'
import actionModel from '../api/actions/models/action.model.js'
import actions from '../api/common/helpers/seed-data/action-data.js'
import {
  getAvailableAreaForAction,
  getAvailableAreaDataRequirements
} from '../available-area/availableArea.js'
import { createCompatibilityMatrix } from '../available-area/compatibilityMatrix.js'
import { getAvailableAreaFixtures } from './setup/getAvailableAreaFixtures.js'

const logger = {
  log: console.log,
  warn: console.warn,
  info: console.info,
  error: console.error
}

let connection

describe('Calculate available area', () => {
  const fixtures = getAvailableAreaFixtures()

  beforeAll(async () => {
    await connectMongo()
    await seedMongo(actionModel, 'action-data', actions)
    await seedMongo(
      compatibilityMatrixModel,
      'compatibility-matrix',
      compatibilityMatrix
    )
    connection = await connectToTestDatbase()
    await seedPostgres(connection, {
      parcels: true,
      covers: true,
      moorland: false,
      landCoverCodes: true,
      landCoverCodesActions: true
    })
  }, 60000)

  afterAll(async () => {
    await closeMongo()
    await resetDatabase(connection)
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

      const compatibilityCheckFn = await createCompatibilityMatrix(logger, [
        'CMOR1',
        'UPL1',
        'UPL2',
        'UPL3',
        'SAM1',
        'SPM4',
        'OFM3',
        'CAHL3',
        'CHRW1',
        'CHRW2',
        'CHRW3',
        'PRF1',
        'PRF2',
        'GRH6',
        'GRH7'
      ])

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
