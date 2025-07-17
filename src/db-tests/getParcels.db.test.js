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
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}

let connection

describe('Calculate available area', () => {
  beforeAll(async () => {
    await connectMongo()
    await seedMongo(actionModel, 'action-data', actions)
    connection = await connectToTestDatbase()
    await seedPostgres(connection, {
      parcels: true,
      covers: true,
      moorland: false,
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

  // All valid area SD6743-6006
  // Valid and Invalid area SD6743-7268
  // All Invalid area (Farmhouse) SD6943-0085

  test('should return 0 stacks for 0 existing actions', async () => {
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
              stacks: [],
              explanations: ['No existing actions so no stacks are needed']
            }
          },
          {
            code: 'UPL1',
            description: 'UPL1: Moderate livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.59268576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [],
              explanations: ['No existing actions so no stacks are needed']
            }
          },
          {
            code: 'UPL2',
            description: 'UPL2: Low livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.59268576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [],
              explanations: ['No existing actions so no stacks are needed']
            }
          },
          {
            code: 'UPL3',
            description: 'UPL3: Limited livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.59268576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [],
              explanations: ['No existing actions so no stacks are needed']
            }
          }
        ]
      }
    ])
  })

  test('should return 1 stack for 1 existing actions', async () => {
    const { h, getResponse } = createResponseCapture()

    await ParcelsController.handler(
      {
        payload: {
          parcelIds: ['SD6743-7268'],
          fields: ['size', 'actions.availableArea', 'actions.results'],
          plannedActions: [{ actionCode: 'CMOR1', quantity: 0.1, unit: 'ha' }]
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
              value: 0.49268576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['CMOR1'],
                  areaSqm: 1000
                }
              ],
              explanations: [
                'Adding CMOR1 (area 0.1 ha)',
                '  Created Stack 1 for CMOR1 with area 0.1 ha'
              ]
            }
          },
          {
            code: 'UPL1',
            description: 'UPL1: Moderate livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.59268576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['CMOR1'],
                  areaSqm: 1000
                }
              ],
              explanations: [
                'Adding CMOR1 (area 0.1 ha)',
                '  Created Stack 1 for CMOR1 with area 0.1 ha'
              ]
            }
          },
          {
            code: 'UPL2',
            description: 'UPL2: Low livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.59268576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['CMOR1'],
                  areaSqm: 1000
                }
              ],
              explanations: [
                'Adding CMOR1 (area 0.1 ha)',
                '  Created Stack 1 for CMOR1 with area 0.1 ha'
              ]
            }
          },
          {
            code: 'UPL3',
            description: 'UPL3: Limited livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.59268576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['CMOR1'],
                  areaSqm: 1000
                }
              ],
              explanations: [
                'Adding CMOR1 (area 0.1 ha)',
                '  Created Stack 1 for CMOR1 with area 0.1 ha'
              ]
            }
          }
        ]
      }
    ])
  })

  test('should return 2 stack for 1 existing actions, and action is incompatible', async () => {
    const { h, getResponse } = createResponseCapture()

    await ParcelsController.handler(
      {
        payload: {
          parcelIds: ['SD6743-7268'],
          fields: ['size', 'actions.availableArea', 'actions.results'],
          plannedActions: [
            { actionCode: 'UPL1', quantity: 0.1, unit: 'ha' },
            { actionCode: 'UPL2', quantity: 0.2, unit: 'ha' }
          ]
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
                  areaSqm: 1000
                },
                {
                  stackNumber: 2,
                  actionCodes: ['UPL2'],
                  areaSqm: 2000
                }
              ],
              explanations: [
                'Adding UPL1 (area 0.1 ha)',
                '  Created Stack 1 for UPL1 with area 0.1 ha',
                'Adding UPL2 (area 0.2 ha)',
                '  UPL2 is not compatible with: UPL1 in Stack 1',
                '  Created Stack 2 for UPL2 with area 0.2 ha'
              ]
            }
          },
          {
            code: 'UPL1',
            description: 'UPL1: Moderate livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.29268576
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
                  areaSqm: 2000
                }
              ],
              explanations: [
                'Adding UPL1 (area 0.1 ha)',
                '  Created Stack 1 for UPL1 with area 0.1 ha',
                'Adding UPL2 (area 0.2 ha)',
                '  UPL2 is not compatible with: UPL1 in Stack 1',
                '  Created Stack 2 for UPL2 with area 0.2 ha'
              ]
            }
          },
          {
            code: 'UPL2',
            description: 'UPL2: Low livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.29268576
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
                  areaSqm: 2000
                }
              ],
              explanations: [
                'Adding UPL1 (area 0.1 ha)',
                '  Created Stack 1 for UPL1 with area 0.1 ha',
                'Adding UPL2 (area 0.2 ha)',
                '  UPL2 is not compatible with: UPL1 in Stack 1',
                '  Created Stack 2 for UPL2 with area 0.2 ha'
              ]
            }
          },
          {
            code: 'UPL3',
            description: 'UPL3: Limited livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.29268576
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
                  areaSqm: 2000
                }
              ],
              explanations: [
                'Adding UPL1 (area 0.1 ha)',
                '  Created Stack 1 for UPL1 with area 0.1 ha',
                'Adding UPL2 (area 0.2 ha)',
                '  UPL2 is not compatible with: UPL1 in Stack 1',
                '  Created Stack 2 for UPL2 with area 0.2 ha'
              ]
            }
          }
        ]
      }
    ])
  })
})
