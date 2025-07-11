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
import { getEnabledActions } from '../api/actions/queries/getActions.query.js'
import actions from '../api/common/helpers/seed-data/action-data.js'
import { getAvailableAreaForAction } from '../available-area/availableArea.js'
import { createCompatibilityMatrix } from '../available-area/calculateAvailableArea.js'
import { getAvailableAreaFixtures } from './setup/getAvailableAreaFixtures.js'

const logger = {
  info: jest.fn(),
  error: jest.fn()
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
        sheetId,
        parcelId,
        applyingForAction,
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
        ['CMOR1', 'UPL1', 'UPL2', 'UPL3', 'SAM1', 'SPM4', 'OFM3'],
        logger
      )

      const enabledActions = await getEnabledActions(logger)
      const currentAction = enabledActions.find(
        (action) => action.code === applyingForAction
      )

      const result = await getAvailableAreaForAction(
        {
          code: applyingForAction,
          landCoverClassCodes: currentAction.landCoverClassCodes
        },
        sheetId,
        parcelId,
        compatibilityCheckFn,
        existingActions,
        connection,
        logger
      )

      expect(result.availableAreaHectares).toEqual(
        Number(expectedAvailableArea)
      )
    }
  )
})
