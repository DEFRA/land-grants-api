/* eslint-disable no-console */
import { ParcelsController } from '~/src/api/parcel/controllers/parcels.controller.js'
import actionModel from '../api/actions/models/action.model.js'
import actions from '../api/common/helpers/seed-data/action-data.js'

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
  info: console.info,
  error: console.error,
  warn: console.warn,
  debug: console.debug
}

let connection

describe('Calculate available area with agreements', () => {
  beforeAll(async () => {
    await connectMongo()
    await seedMongo(actionModel, 'action-data', actions)
    connection = await connectToTestDatbase()
    await seedPostgres(connection, {
      parcels: true,
      covers: true,
      moorland: false,
      agreements: true,
      landCoverCodes: true,
      landCoverCodesActions: true,
      compatibilityMatrix: true
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
          plannedActions: []
        },
        logger,
        server: {
          postgresDb: connection
        }
      },
      h
    )

    const { data, statusCode } = getResponse()
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
                  areaSqm: 1000
                }
              ],
              explanations: [
                'Adding UPL1 (area 0.1 ha)',
                '  Created Stack 1 for UPL1 with area 0.1 ha'
              ]
            }
          },
          {
            code: 'UPL1',
            description: 'UPL1: Moderate livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.49268576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL1'],
                  areaSqm: 1000
                }
              ],
              explanations: [
                'Adding UPL1 (area 0.1 ha)',
                '  Created Stack 1 for UPL1 with area 0.1 ha'
              ]
            }
          },
          {
            code: 'UPL2',
            description: 'UPL2: Low livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.49268576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL1'],
                  areaSqm: 1000
                }
              ],
              explanations: [
                'Adding UPL1 (area 0.1 ha)',
                '  Created Stack 1 for UPL1 with area 0.1 ha'
              ]
            }
          },
          {
            code: 'UPL3',
            description: 'UPL3: Limited livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.49268576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL1'],
                  areaSqm: 1000
                }
              ],
              explanations: [
                'Adding UPL1 (area 0.1 ha)',
                '  Created Stack 1 for UPL1 with area 0.1 ha'
              ]
            }
          }
        ]
      }
    ])
  })

  test('should return 1 stack for 1 existing agreement actions, 1 stack for 1 planned action', async () => {
    const { h, getResponse } = createResponseCapture()

    await ParcelsController.handler(
      {
        payload: {
          parcelIds: ['SD6743-7268'],
          fields: ['size', 'actions.availableArea', 'actions.results'],
          plannedActions: [{ actionCode: 'UPL2', quantity: 0.1, unit: 'ha' }]
        },
        logger,
        server: {
          postgresDb: connection
        }
      },
      h
    )

    const { data, statusCode } = getResponse()

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
                  areaSqm: 1000
                },
                {
                  stackNumber: 2,
                  actionCodes: ['UPL2'],
                  areaSqm: 1000
                }
              ],
              explanations: [
                'Adding UPL1 (area 0.1 ha)',
                '  Created Stack 1 for UPL1 with area 0.1 ha',
                'Adding UPL2 (area 0.1 ha)',
                '  UPL2 is not compatible with: UPL1 in Stack 1',
                '  Created Stack 2 for UPL2 with area 0.1 ha'
              ]
            }
          },
          {
            code: 'UPL1',
            description: 'UPL1: Moderate livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.39268576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL1'],
                  areaSqm: 1000
                },
                {
                  stackNumber: 2,
                  actionCodes: ['UPL2'],
                  areaSqm: 1000
                }
              ],
              explanations: [
                'Adding UPL1 (area 0.1 ha)',
                '  Created Stack 1 for UPL1 with area 0.1 ha',
                'Adding UPL2 (area 0.1 ha)',
                '  UPL2 is not compatible with: UPL1 in Stack 1',
                '  Created Stack 2 for UPL2 with area 0.1 ha'
              ]
            }
          },
          {
            code: 'UPL2',
            description: 'UPL2: Low livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.39268576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL1'],
                  areaSqm: 1000
                },
                {
                  stackNumber: 2,
                  actionCodes: ['UPL2'],
                  areaSqm: 1000
                }
              ],
              explanations: [
                'Adding UPL1 (area 0.1 ha)',
                '  Created Stack 1 for UPL1 with area 0.1 ha',
                'Adding UPL2 (area 0.1 ha)',
                '  UPL2 is not compatible with: UPL1 in Stack 1',
                '  Created Stack 2 for UPL2 with area 0.1 ha'
              ]
            }
          },
          {
            code: 'UPL3',
            description: 'UPL3: Limited livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.39268576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL1'],
                  areaSqm: 1000
                },
                {
                  stackNumber: 2,
                  actionCodes: ['UPL2'],
                  areaSqm: 1000
                }
              ],
              explanations: [
                'Adding UPL1 (area 0.1 ha)',
                '  Created Stack 1 for UPL1 with area 0.1 ha',
                'Adding UPL2 (area 0.1 ha)',
                '  UPL2 is not compatible with: UPL1 in Stack 1',
                '  Created Stack 2 for UPL2 with area 0.1 ha'
              ]
            }
          }
        ]
      }
    ])
  })
})
