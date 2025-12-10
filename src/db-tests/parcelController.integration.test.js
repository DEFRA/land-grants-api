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

// eslint-disable-next-line jest/no-disabled-tests
describe.skip('Calculate available area with agreements', () => {
  beforeAll(async () => {
    connection = connectToTestDatbase()
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
          parcelIds: ['SD6747-7269'],
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
        sheetId: 'SD6747',
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
            ratePerUnitGbp: 10.6,
            ratePerAgreementPerYearGbp: 272,
            results: {
              totalValidLandCoverSqm: 5927,
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
            description: 'Moderate livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.4927
            },
            ratePerUnitGbp: 20,
            results: {
              totalValidLandCoverSqm: 5927,
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
            description: 'Low livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.4927
            },
            ratePerUnitGbp: 53,
            results: {
              totalValidLandCoverSqm: 5927,
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
            description: 'Limited livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.4927
            },
            ratePerUnitGbp: 66,
            results: {
              totalValidLandCoverSqm: 5927,
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
          parcelIds: ['SD6747-7269'],
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
        sheetId: 'SD6747',
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
            ratePerUnitGbp: 10.6,
            ratePerAgreementPerYearGbp: 272,
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
                  areaSqm: 1000
                }
              ],
              explanations: expect.any(Array)
            }
          },
          {
            code: 'UPL1',
            description: 'Moderate livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.3927
            },
            ratePerUnitGbp: 20,
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
                  areaSqm: 1000
                }
              ],
              explanations: expect.any(Array)
            }
          },
          {
            code: 'UPL2',
            description: 'Low livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.3927
            },
            ratePerUnitGbp: 53,
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
                  areaSqm: 1000
                }
              ],
              explanations: expect.any(Array)
            }
          },
          {
            code: 'UPL3',
            description: 'Limited livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.3927
            },
            ratePerUnitGbp: 66,
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
