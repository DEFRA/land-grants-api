import { ParcelsController } from '~/src/api/parcel/controllers/parcels.controller.js'

import {
  connectToTestDatbase,
  resetGetParcelTestData,
  seedForGetParcelTest
} from '~/src/db-tests/setup/postgres.js'
import { createResponseCapture } from '~/src/db-tests/setup/utils.js'
import { logger } from './testLogger.js'

let connection

describe('Calculate available area', () => {
  beforeAll(async () => {
    connection = connectToTestDatbase()
    await seedForGetParcelTest(connection)
  })

  afterAll(async () => {
    await resetGetParcelTestData(connection)
    await connection.end()
  })

  // All valid area SD6743-6006
  // Valid and Invalid area SD6743-7271
  // All Invalid area (Farmhouse) SD6943-0085

  test('should return 0 stacks for 0 existing actions', async () => {
    const { h, getResponse } = createResponseCapture()

    await ParcelsController.handler(
      {
        payload: {
          parcelIds: ['SD6743-7271'],
          fields: ['size', 'actions', 'actions.results'],
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
        parcelId: '7271',
        sheetId: 'SD6743',
        size: {
          unit: 'ha',
          value: 0.6564
        },
        actions: [
          {
            code: 'CMOR1',
            description: 'Assess moorland and produce a written record',
            availableArea: {
              unit: 'ha',
              value: 0.5927
            },
            results: {
              totalValidLandCoverSqm: 5927,
              stacks: [],
              explanations: expect.any(Array)
            },
            ratePerUnitGbp: 10.6,
            ratePerAgreementPerYearGbp: 272
          },
          {
            code: 'UPL1',
            description: 'Moderate livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.5927
            },
            results: {
              totalValidLandCoverSqm: 5927,
              stacks: [],
              explanations: expect.any(Array)
            },
            ratePerUnitGbp: 20
          },
          {
            code: 'UPL2',
            description: 'Low livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.5927
            },
            results: {
              totalValidLandCoverSqm: 5927,
              stacks: [],
              explanations: expect.any(Array)
            },
            ratePerUnitGbp: 53
          },
          {
            code: 'UPL3',
            description: 'Limited livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.5927
            },
            results: {
              totalValidLandCoverSqm: 5927,
              stacks: [],
              explanations: expect.any(Array)
            },
            ratePerUnitGbp: 66
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
          parcelIds: ['SD6743-7271'],
          fields: ['size', 'actions', 'actions.results'],
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
        parcelId: '7271',
        sheetId: 'SD6743',
        size: {
          unit: 'ha',
          value: 0.6564
        },
        actions: [
          {
            code: 'CMOR1',
            description: 'Assess moorland and produce a written record',
            availableArea: {
              unit: 'ha',
              value: 0.4927
            },
            results: {
              totalValidLandCoverSqm: 5927,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['CMOR1'],
                  areaSqm: 1000
                }
              ],
              explanations: expect.any(Array)
            },
            ratePerUnitGbp: 10.6,
            ratePerAgreementPerYearGbp: 272
          },
          {
            code: 'UPL1',
            description: 'Moderate livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.5927
            },
            results: {
              totalValidLandCoverSqm: 5927,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['CMOR1'],
                  areaSqm: 1000
                }
              ],
              explanations: expect.any(Array)
            },
            ratePerUnitGbp: 20
          },
          {
            code: 'UPL2',
            description: 'Low livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.5927
            },
            results: {
              totalValidLandCoverSqm: 5927,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['CMOR1'],
                  areaSqm: 1000
                }
              ],
              explanations: expect.any(Array)
            },
            ratePerUnitGbp: 53
          },
          {
            code: 'UPL3',
            description: 'Limited livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.5927
            },
            results: {
              totalValidLandCoverSqm: 5927,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['CMOR1'],
                  areaSqm: 1000
                }
              ],
              explanations: expect.any(Array)
            },
            ratePerUnitGbp: 66
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
          parcelIds: ['SD6743-7271'],
          fields: ['size', 'actions', 'actions.results'],
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
    expect(statusCode).toBe(200)
    expect(data.message).toBe('success')
    expect(data.parcels).toEqual([
      {
        parcelId: '7271',
        sheetId: 'SD6743',
        size: {
          unit: 'ha',
          value: 0.6564
        },
        actions: [
          {
            code: 'CMOR1',
            description: 'Assess moorland and produce a written record',
            availableArea: {
              unit: 'ha',
              value: 0.5927
            },
            results: {
              totalValidLandCoverSqm: 5927,
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
              explanations: expect.any(Array)
            },
            ratePerUnitGbp: 10.6,
            ratePerAgreementPerYearGbp: 272
          },
          {
            code: 'UPL1',
            description: 'Moderate livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.2927
            },
            results: {
              totalValidLandCoverSqm: 5927,
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
              explanations: expect.any(Array)
            },
            ratePerUnitGbp: 20
          },
          {
            code: 'UPL2',
            description: 'Low livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.2927
            },
            results: {
              totalValidLandCoverSqm: 5927,
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
              explanations: expect.any(Array)
            },
            ratePerUnitGbp: 53
          },
          {
            code: 'UPL3',
            description: 'Limited livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.2927
            },
            results: {
              totalValidLandCoverSqm: 5927,
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
              explanations: expect.any(Array)
            },
            ratePerUnitGbp: 66
          }
        ]
      }
    ])
  })
})
