/* eslint-disable no-console */
import { ParcelsController } from '~/src/api/parcel/controllers/1.0.0/parcels.controller.js'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'
import { createResponseCapture } from '~/src/tests/db-tests/setup/utils.js'
import { vi } from 'vitest'

function getSnapshotName(testName, parcel, action) {
  return `${testName},${parcel.sheetId}-${parcel.parcelId} ${action.code}-explanations`
}

describe('Parcels Controller', () => {
  let logger, connection

  beforeAll(() => {
    logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    }
    connection = connectToTestDatbase()
  })

  afterAll(async () => {
    await connection.end()
  })

  test('should return a 200 status code when size and actions are is requested', async () => {
    const { h, getResponse } = createResponseCapture()

    await ParcelsController.handler(
      {
        payload: {
          parcelIds: ['SD5649-9215'],
          fields: ['size', 'actions']
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
        parcelId: '9215',
        sheetId: 'SD5649',
        size: {
          unit: 'ha',
          value: 764.229
        },
        actions: [
          {
            code: 'CMOR1',
            description: 'Assess moorland and produce a written record',
            availableArea: {
              unit: 'ha',
              value: 762.8977
            },
            ratePerUnitGbp: 10.6,
            ratePerAgreementPerYearGbp: 272
          },
          {
            code: 'UPL1',
            description: 'Moderate livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 762.8977
            },
            ratePerUnitGbp: 20
          },
          {
            code: 'UPL2',
            description: 'Low livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 762.8977
            },
            ratePerUnitGbp: 53
          },
          {
            code: 'UPL3',
            description: 'Limited livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 762.8977
            },
            ratePerUnitGbp: 66
          }
        ]
      }
    ])
  })

  test('should return a 200 status code and 1 stack for 1 actions when actions.results is requested', async () => {
    const { h, getResponse } = createResponseCapture()

    await ParcelsController.handler(
      {
        payload: {
          parcelIds: ['SD7247-8028'],
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
        parcelId: '8028',
        sheetId: 'SD7247',
        size: {
          unit: 'ha',
          value: 1.8905
        },
        actions: [
          {
            code: 'CMOR1',
            description: 'Assess moorland and produce a written record',
            availableArea: {
              unit: 'ha',
              value: 0
            },
            ratePerUnitGbp: 10.6,
            ratePerAgreementPerYearGbp: 272,
            results: {
              totalValidLandCoverSqm: 18905,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UP3', 'MOR1'],
                  areaSqm: 18905
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
              value: 0
            },
            ratePerUnitGbp: 20,
            results: {
              totalValidLandCoverSqm: 18905,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UP3', 'MOR1'],
                  areaSqm: 18905
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
              value: 0
            },
            ratePerUnitGbp: 53,
            results: {
              totalValidLandCoverSqm: 18905,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UP3', 'MOR1'],
                  areaSqm: 18905
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
              value: 0
            },
            ratePerUnitGbp: 66,
            results: {
              totalValidLandCoverSqm: 18905,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UP3', 'MOR1'],
                  areaSqm: 18905
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

  test('should return a 200 status code and multiple stacks for 1 action, 1 stack for 1 planned action when actions.results is requested', async () => {
    const { h, getResponse } = createResponseCapture()

    await ParcelsController.handler(
      {
        payload: {
          parcelIds: ['SD7247-8028'],
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
        parcelId: '8028',
        sheetId: 'SD7247',
        size: {
          unit: 'ha',
          value: 1.8905
        },
        actions: [
          {
            code: 'CMOR1',
            description: 'Assess moorland and produce a written record',
            availableArea: {
              unit: 'ha',
              value: 0
            },
            ratePerUnitGbp: 10.6,
            ratePerAgreementPerYearGbp: 272,
            results: {
              totalValidLandCoverSqm: 18905,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL2', 'MOR1'],
                  areaSqm: 1000
                },
                {
                  stackNumber: 2,
                  actionCodes: ['UP3', 'MOR1'],
                  areaSqm: 17905
                },
                {
                  stackNumber: 3,
                  actionCodes: ['UP3'],
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
              value: 0
            },
            ratePerUnitGbp: 20,
            results: {
              totalValidLandCoverSqm: 18905,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL2', 'MOR1'],
                  areaSqm: 1000
                },
                {
                  stackNumber: 2,
                  actionCodes: ['UP3', 'MOR1'],
                  areaSqm: 17905
                },
                {
                  stackNumber: 3,
                  actionCodes: ['UP3'],
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
              value: 0
            },
            ratePerUnitGbp: 53,
            results: {
              totalValidLandCoverSqm: 18905,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL2', 'MOR1'],
                  areaSqm: 1000
                },
                {
                  stackNumber: 2,
                  actionCodes: ['UP3', 'MOR1'],
                  areaSqm: 17905
                },
                {
                  stackNumber: 3,
                  actionCodes: ['UP3'],
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
              value: 0
            },
            ratePerUnitGbp: 66,
            results: {
              totalValidLandCoverSqm: 18905,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL2', 'MOR1'],
                  areaSqm: 1000
                },
                {
                  stackNumber: 2,
                  actionCodes: ['UP3', 'MOR1'],
                  areaSqm: 17905
                },
                {
                  stackNumber: 3,
                  actionCodes: ['UP3'],
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
