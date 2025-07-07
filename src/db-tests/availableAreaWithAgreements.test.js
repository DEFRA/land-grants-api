import compatibilityMatrix from '~/src/api/common/helpers/seed-data/compatibility-matrix.js'
import compatibilityMatrixModel from '~/src/api/compatibility-matrix/models/compatibilityMatrix.model.js'
import { ParcelsController } from '~/src/api/parcel/controllers/parcels.controller.js'
import actionModel from '../api/actions/models/action.model.js'
import actions from '../api/common/helpers/seed-data/action-data.js'
import landCoverCodes from '../api/common/helpers/seed-data/land-cover-codes.js'
import landCoverCodesModel from '../api/land-cover-codes/models/land-cover-codes.model.js'

import {
  connectToTestDatbase,
  resetDatabase,
  seedPostgres
} from '~/src/db-tests/setup/postgres.js'
import {
  closeMongo,
  connectMongo,
  createResponseCapture,
  seedMongo
} from '~/src/db-tests/setup/utils.js'

const logger = {
  info: jest.fn(),
  error: jest.fn()
}

let connection

describe('Calculate available area with agreements', () => {
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
    await seedPostgres(connection, {
      parcels: true,
      covers: true,
      moorland: false,
      agreements: true
    })
  }, 60000)

  afterAll(async () => {
    await closeMongo()
    await resetDatabase(connection)
    await connection.end()
  })

  test('should return 1 stack for 1 existing agreement actions', async () => {
    const { h, getResponse } = createResponseCapture()

    await ParcelsController.handler(
      {
        payload: {
          parcelIds: ['SD6743-7268'],
          fields: ['size', 'actions.availableArea', 'actions.results'],
          existingActions: []
        },
        logger,
        server: {
          postgresDb: connection
        }
      },
      h
    )

    const { data, statusCode } = getResponse()
    // console.log(JSON.stringify(data, null, 2))

    expect(statusCode).toBe(200)
    expect(data.message).toBe('success')
    expect(data.parcels).toEqual([
      {
        parcelId: '7268',
        sheetId: 'SD6743',
        size: {
          unit: 'ha',
          value: 0.656374
        },
        actions: [
          {
            code: 'CMOR1',
            description: 'CMOR1: Assess moorland and produce a written record',
            availableArea: {
              unit: 'ha',
              value: 0.59268576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL1'],
                  areaSqm: 12.9
                }
              ],
              explanations: [
                'Adding UPL1 (area 0.0012900000000000001 ha)',
                '  Created Stack 1 for UPL1 with area 0.0012900000000000001 ha'
              ]
            }
          },
          {
            code: 'UPL1',
            description: 'UPL1: Moderate livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.59139576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL1'],
                  areaSqm: 12.9
                }
              ],
              explanations: [
                'Adding UPL1 (area 0.0012900000000000001 ha)',
                '  Created Stack 1 for UPL1 with area 0.0012900000000000001 ha'
              ]
            }
          },
          {
            code: 'UPL2',
            description: 'UPL2: Low livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.59139576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL1'],
                  areaSqm: 12.9
                }
              ],
              explanations: [
                'Adding UPL1 (area 0.0012900000000000001 ha)',
                '  Created Stack 1 for UPL1 with area 0.0012900000000000001 ha'
              ]
            }
          },
          {
            code: 'UPL3',
            description: 'UPL3: Limited livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.59139576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL1'],
                  areaSqm: 12.9
                }
              ],
              explanations: [
                'Adding UPL1 (area 0.0012900000000000001 ha)',
                '  Created Stack 1 for UPL1 with area 0.0012900000000000001 ha'
              ]
            }
          }
        ]
      }
    ])
  })
})
