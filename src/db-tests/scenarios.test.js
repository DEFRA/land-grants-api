import compatibilityMatrixModel from '~/src/api/compatibility-matrix/models/compatibilityMatrix.model.js'
import landCoverCodesModel from '../api/land-cover-codes/models/land-cover-codes.model.js'
import landCoverCodes from '../api/common/helpers/seed-data/land-cover-codes.js'
import actions from '../api/common/helpers/seed-data/action-data.js'
import actionModel from '../api/actions/models/action.model.js'
import compatibilityMatrix from '~/src/api/common/helpers/seed-data/compatibility-matrix.js'
import { getAvailableAreaForAction } from '../available-area/availableArea.js'
import {
  connectToTestDatbase,
  resetDatabase,
  seedDatabase
} from '~/src/db-tests/setup/postgres.js'
import {
  connectMongo,
  seedMongo,
  closeMongo
} from '~/src/db-tests/setup/utils.js'
import { createCompatibilityMatrix } from '../available-area/index.js'
import { getEnabledActions } from '../api/actions/queries/getActions.query.js'
import { getAvailableAreaFixtures } from './fixtures/getAvailableAreaFixtures.js'

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
    await seedMongo(landCoverCodesModel, 'land-cover-codes', landCoverCodes)
    connection = await connectToTestDatbase()
    await seedDatabase(
      connection,
      'land-parcels-data.sql',
      '../../api/common/migration'
    )
    await seedDatabase(
      connection,
      'land-covers-data.sql',
      '../../api/common/migration'
    )
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
        expectedActionCode,
        expectedSheetId,
        expectedParcelId,
        expectedAvailableAreaValue
      }
    ) => {
      const compatibilityCheckFn = await createCompatibilityMatrix(
        ['CMOR1', 'UPL1', 'UPL2', 'UPL3'],
        logger
      )

      const enabledActions = await getEnabledActions(logger)
      const currentAction = enabledActions.find(
        (action) => action.code === expectedActionCode
      )

      const result = await getAvailableAreaForAction(
        {
          code: expectedActionCode,
          areaSqm: 1000,
          landCoverClassCodes: currentAction.landCoverClassCodes
        },
        expectedSheetId,
        expectedParcelId,
        compatibilityCheckFn,
        [],
        connection,
        logger
      )

      expect(result.availableAreaHectares).toEqual(
        Number(expectedAvailableAreaValue)
      )
    }
  )
})
