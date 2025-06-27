import compatibilityMatrixModel from '~/src/api/compatibility-matrix/models/compatibilityMatrix.model.js'
import { MockParcelsController } from '~/src/available-area/index.js'
import landCoverCodesModel from '../api/land-cover-codes/models/land-cover-codes.model.js'
import landCoverCodes from '../api/common/helpers/seed-data/land-cover-codes.js'
import actions from '../api/common/helpers/seed-data/action-data.js'
import actionModel from '../api/actions/models/action.model.js'
import compatibilityMatrix from '~/src/api/common/helpers/seed-data/compatibility-matrix.js'

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

const logger = {
  info: jest.fn(),
  error: jest.fn()
}

let connection

describe('Calculate available area', () => {
  beforeAll(async () => {
    await connectMongo()
    await seedMongo(actionModel, 'action', actions)
    await seedMongo(
      compatibilityMatrixModel,
      'compatibility-matrix',
      compatibilityMatrix
    )
    await seedMongo(landCoverCodesModel, 'land-cover-codes', landCoverCodes)
    connection = await connectToTestDatbase()
    await seedDatabase(connection, 'availableAreaParcelsController.sql')
  })

  afterAll(async () => {
    await closeMongo()
    await resetDatabase(connection)
    await connection.end()
  })

  // All valid area SD6743-6006
  // Valid and Invalid area SD6743-7268
  // All Invalid area (Farmhouse) SD6943-0085

  test('should return 0 stacks for 0 existing actions', async () => {
    const sheetId = 'SD6743'
    const parcelId = '7268'
    const existingActions = []
    const actionToProcess = [{ code: 'CMOR1' }]
    const result = await MockParcelsController(
      sheetId,
      parcelId,
      existingActions,
      actionToProcess,
      connection,
      logger
    )

    expect(result).toEqual({
      explanations: ['No existing actions so no stacks are needed'],
      stacks: [],
      availableAreaSqm: 5926.857555290695,
      totalValidLandCoverSqm: 5926.857555290695,
      availableAreaHectares: 0.59268576
    })
  })

  test('should return 1 stack for 1 existing actions', async () => {
    const sheetId = 'SD6743'
    const parcelId = '7268'
    const existingActions = [{ code: 'CMOR1', areaSqm: 1000 }]
    const actionToProcess = [{ code: 'UPL1' }]
    const result = await MockParcelsController(
      sheetId,
      parcelId,
      existingActions,
      actionToProcess,
      connection,
      logger
    )

    expect(result).toEqual({
      explanations: [
        'Adding CMOR1 (area 0.1 ha)',
        '  Created Stack 1 for CMOR1 with area 0.1 ha'
      ],
      stacks: [
        {
          stackNumber: 1,
          actionCodes: ['CMOR1'],
          areaSqm: 1000
        }
      ],
      availableAreaSqm: 5926.857555290695,
      totalValidLandCoverSqm: 5926.857555290695,
      availableAreaHectares: 0.59268576
    })
  })

  test('should return 2 stack for 1 existing actions, and action is incompatible', async () => {
    const sheetId = 'SD6743'
    const parcelId = '7268'
    const existingActions = [
      { code: 'UPL1', areaSqm: 1000 },
      { code: 'UPL2', areaSqm: 2000 }
    ]
    const actionToProcess = [{ code: 'UPL3' }]
    const result = await MockParcelsController(
      sheetId,
      parcelId,
      existingActions,
      actionToProcess,
      connection,
      logger
    )

    expect(result).toEqual({
      explanations: [
        'Adding UPL1 (area 0.1 ha)',
        '  Created Stack 1 for UPL1 with area 0.1 ha',
        'Adding UPL2 (area 0.2 ha)',
        '  UPL2 is not compatible with: UPL1 in Stack 1',
        '  Created Stack 2 for UPL2 with area 0.2 ha'
      ],
      stacks: [
        {
          stackNumber: 1,
          actionCodes: ['UPL1'],
          areaSqm: 1000
        },
        {
          stackNumber: 2,
          actionCodes: ['UPL2'],
          areaSqm: 2000
        }
      ],
      totalValidLandCoverSqm: 5926.857555290695,
      availableAreaSqm: 2926.857555290695,
      availableAreaHectares: 0.29268576
    })
  })
})
