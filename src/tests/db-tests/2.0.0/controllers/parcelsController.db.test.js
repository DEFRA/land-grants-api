import { ParcelsControllerV2 } from '~/src/features/parcel/controllers/2.0.0/parcels.controller.js'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'
import { createResponseCapture } from '~/src/tests/db-tests/setup/utils.js'
import { logger } from '~/src/tests/db-tests/setup/testLogger.js'

describe('Parcels Controller 2.0.0', () => {
  let connection

  beforeAll(() => {
    connection = connectToTestDatbase()
  })

  afterAll(async () => {
    await connection.end()
  })

  test('should return a 200 status code and valid parcel when sssiConsentRequired is requested', async () => {
    const { h, getResponse } = createResponseCapture()

    await ParcelsControllerV2.handler(
      {
        payload: {
          parcelIds: ['SD5649-9215'],
          fields: ['size', 'actions', 'actions.sssiConsentRequired'],
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
            ratePerAgreementPerYearGbp: 272,
            sssiConsentRequired: false,
            version: '2.0.0'
          },
          {
            code: 'UPL1',
            description: 'Moderate livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 762.8977
            },
            ratePerUnitGbp: 35,
            sssiConsentRequired: true,
            version: '3.0.0'
          },
          {
            code: 'UPL2',
            description: 'Low livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 762.8977
            },
            ratePerUnitGbp: 89,
            sssiConsentRequired: true,
            version: '3.0.0'
          },
          {
            code: 'UPL3',
            description: 'Limited livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 762.8977
            },
            ratePerUnitGbp: 111,
            sssiConsentRequired: true,
            version: '3.0.0'
          }
        ]
      }
    ])
  })
})
