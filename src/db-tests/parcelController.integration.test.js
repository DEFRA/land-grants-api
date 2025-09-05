/* eslint-disable no-console */
import { ParcelsController } from '~/src/api/parcel/controllers/parcels.controller.js'
import {
  connectToTestDatbase,
  resetParcelControllerTestData,
  seedForParcelControllerTest
} from '~/src/db-tests/setup/postgres.js'
import { createResponseCapture } from './setup/utils.js'

const logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}

let connection

function getSnapshotName(testName, parcel, action) {
  return `${testName},${parcel.sheetId}-${parcel.parcelId} ${action.code}-explanations`
}

describe('Calculate available area with agreements', () => {
  beforeAll(async () => {
    connection = await connectToTestDatbase()
    await seedForParcelControllerTest(connection)
  })

  afterAll(async () => {
    await resetParcelControllerTestData(connection)
    await connection.end()
  })

  test('should return 1 stack for 1 existing agreement actions', async () => {
    const { h, getResponse } = createResponseCapture()

    await ParcelsController.handler(
      {
        payload: {
          parcelIds: ['SD6743-7269'],
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
        parcelId: '7269',
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
            ratePerUnitGbp: 10.6,
            ratePerAgreementPerYearGbp: 272,
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL1'],
                  areaSqm: 1000
                }
              ],
              explanations: expect.any(Array)
            }
          },
          {
            code: 'UPL1',
            description: 'UPL1: Moderate livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.49268576
            },
            ratePerUnitGbp: 20,
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL1'],
                  areaSqm: 1000
                }
              ],
              explanations: expect.any(Array)
            }
          },
          {
            code: 'UPL2',
            description: 'UPL2: Low livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.49268576
            },
            ratePerUnitGbp: 53,
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL1'],
                  areaSqm: 1000
                }
              ],
              explanations: expect.any(Array)
            }
          },
          {
            code: 'UPL3',
            description: 'UPL3: Limited livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.49268576
            },
            ratePerUnitGbp: 66,
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL1'],
                  areaSqm: 1000
                }
              ],
              explanations: expect.any(Array)
            }
          }
        ]
      }
    ])

    for (const action of data.parcels[0].actions) {
      expect(action.results.explanations).toMatchSnapshot(
        getSnapshotName(
          'should return 1 stack for 1 existing agreement actions',
          data.parcels[0],
          action
        )
      )
    }
  }, 120000)

  test('should return 1 stack for 1 existing agreement actions, 1 stack for 1 planned action', async () => {
    const { h, getResponse } = createResponseCapture()

    await ParcelsController.handler(
      {
        payload: {
          parcelIds: ['SD6743-7269'],
          fields: ['size', 'actions', 'actions.results'],
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
        parcelId: '7269',
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
            ratePerUnitGbp: 10.6,
            ratePerAgreementPerYearGbp: 272,
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
              explanations: expect.any(Array)
            }
          },
          {
            code: 'UPL1',
            description: 'UPL1: Moderate livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.39268576
            },
            ratePerUnitGbp: 20,
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
              explanations: expect.any(Array)
            }
          },
          {
            code: 'UPL2',
            description: 'UPL2: Low livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.39268576
            },
            ratePerUnitGbp: 53,
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
              explanations: expect.any(Array)
            }
          },
          {
            code: 'UPL3',
            description: 'UPL3: Limited livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.39268576
            },
            ratePerUnitGbp: 66,
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
              explanations: expect.any(Array)
            }
          }
        ]
      }
    ])

    for (const action of data.parcels[0].actions) {
      expect(action.results.explanations).toMatchSnapshot(
        getSnapshotName(
          'should return 1 stack for 1 existing agreement actions, 1 stack for 1 planned action',
          data.parcels[0],
          action
        )
      )
    }
  }, 120000)
})
