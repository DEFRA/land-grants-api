import { ParcelsControllerV2 } from '~/src/features/parcel/controllers/2.0.0/parcels.controller.js'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'
import { createResponseCapture } from '~/src/tests/db-tests/setup/utils.js'
import { logger } from '~/src/tests/db-tests/setup/testLogger.js'
import { actions } from '~/src/tests/db-tests/fixtures/actions.js'
import { getActionsByLatestVersion } from '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'

vi.mock(
  '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
)
const mockGetEnabledActions = getActionsByLatestVersion

describe('Parcels Controller 2.0.0', () => {
  let connection

  beforeAll(() => {
    connection = connectToTestDatbase()
  })

  afterAll(async () => {
    await connection.end()
  })

  beforeEach(() => {
    mockGetEnabledActions.mockResolvedValue(actions)
  })

  test('should return a 200 status code with groups when groups field is requested', async () => {
    const { h, getResponse } = createResponseCapture()

    await ParcelsControllerV2.handler(
      {
        payload: {
          parcelIds: ['SD5649-9215'],
          fields: ['groups'],
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
    expect(data.groups).toEqual([
      { name: 'Assess moorland', actions: ['CMOR1'] },
      {
        name: 'Livestock grazing on moorland',
        actions: ['UPL1', 'UPL2', 'UPL3']
      }
    ])
  })

  test('should not return groups when groups field is not requested', async () => {
    const { h, getResponse } = createResponseCapture()

    await ParcelsControllerV2.handler(
      {
        payload: {
          parcelIds: ['SD5649-9215'],
          fields: ['size'],
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
    expect(data.groups).toBeUndefined()
  })

  test('should return a 200 status code and valid parcel when sssiConsentRequired is requested', async () => {
    const { h, getResponse } = createResponseCapture()

    await ParcelsControllerV2.handler(
      {
        payload: {
          parcelIds: ['SD5649-9215'],
          fields: [
            'size',
            'actions',
            'actions.sssiConsentRequired',
            'actions.heferRequired'
          ],
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
            heferRequired: false,
            version: '2.0.0'
          },
          {
            code: 'UPL1',
            description: 'Moderate livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 762.8977
            },
            ratePerUnitGbp: 20,
            sssiConsentRequired: true,
            heferRequired: false,
            version: '2.0.0'
          },
          {
            code: 'UPL2',
            description: 'Low livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 762.8977
            },
            ratePerUnitGbp: 53,
            sssiConsentRequired: true,
            heferRequired: false,
            version: '2.0.0'
          },
          {
            code: 'UPL3',
            description: 'Limited livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 762.8977
            },
            ratePerUnitGbp: 66,
            sssiConsentRequired: true,
            heferRequired: false,
            version: '2.0.0'
          }
        ]
      }
    ])
  })
})
