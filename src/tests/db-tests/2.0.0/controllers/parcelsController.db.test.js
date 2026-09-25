import { ParcelsControllerV2 } from '~/src/features/parcel/controllers/2.0.0/parcels.controller.js'
import { actions } from '~/src/tests/db-tests/fixtures/actions.js'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'
import { createResponseCapture } from '~/src/tests/db-tests/setup/utils.js'
import { getActionsByLatestVersion } from '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
import { getAgreements } from '~/src/services/dal/index.js'
import { logger } from '~/src/tests/db-tests/setup/testLogger.js'

vi.mock('~/src/services/dal/index.js')
vi.mock(
  '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
)
const mockGetAgreements = getAgreements
const mockGetEnabledActions = getActionsByLatestVersion

describe('Parcels Controller 2.0.0', () => {
  let connection

  beforeAll(() => {
    connection = connectToTestDatabase()
  })

  afterAll(async () => {
    await connection.end()
  })

  beforeEach(() => {
    mockGetAgreements.mockResolvedValue([])
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
        headers: { 'x-forwarded-authorization': 'dummy' },
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
        headers: { 'x-forwarded-authorization': 'dummy' },
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
        headers: { 'x-forwarded-authorization': 'dummy' },
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
            availability: {
              unit: 'ha',
              value: 762.9068
            },
            quantityRequired: true,
            isAvailable: true,
            ratePerUnitGbp: 10.6,
            ratePerAgreementPerYearGbp: 272,
            sssiConsentRequired: false,
            heferRequired: false,
            version: '2.0.0'
          },
          {
            code: 'UPL1',
            description: 'Moderate livestock grazing on moorland',
            availability: {
              unit: 'ha',
              value: 762.9068
            },
            quantityRequired: true,
            isAvailable: true,
            ratePerUnitGbp: 20,
            sssiConsentRequired: true,
            heferRequired: false,
            version: '2.0.0'
          },
          {
            code: 'UPL2',
            description: 'Low livestock grazing on moorland',
            availability: {
              unit: 'ha',
              value: 762.9068
            },
            quantityRequired: true,
            isAvailable: true,
            ratePerUnitGbp: 53,
            sssiConsentRequired: true,
            heferRequired: false,
            version: '2.0.0'
          },
          {
            code: 'UPL3',
            description: 'Limited livestock grazing on moorland',
            availability: {
              unit: 'ha',
              value: 762.9068
            },
            quantityRequired: true,
            isAvailable: true,
            ratePerUnitGbp: 66,
            sssiConsentRequired: true,
            heferRequired: false,
            version: '2.0.0'
          }
        ]
      }
    ])
  })

  describe('linear actions', () => {
    // ST_Perimeter of each parcel in the seeded extract. SD6252-3622 is the
    // shortest carrying agreements, and the two it has are areas
    const parcelId = 'NY8836-6516'
    const perimeterMeters = 2389
    const shortParcelId = 'SD6252-3622'
    const shortPerimeterMeters = 295

    const bnd1 = {
      enabled: true,
      code: 'BND1',
      groupId: 3,
      groupName: 'Boundaries',
      payment: { ratePerUnitGbp: 0.27 },
      applicationUnitOfMeasurement: 'm',
      durationYears: 3,
      startDate: '2025-01-01',
      version: 1,
      display: true,
      description: 'Maintain dry stone walls',
      semanticVersion: '1.0.0',
      rules: []
    }

    // Metre agreements are dropped on ingest, so anything competing for the
    // boundary reaches us from the DAL rather than the agreements table
    const dalAgreement = (actionCode, quantity) => ({
      '6516-NY8836': [
        {
          actionCode,
          quantity,
          unit: 'm',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2030-01-01')
        }
      ]
    })

    const actionOf = (data) => data.parcels[0].actions[0]
    const availabilityOf = (data) => actionOf(data).availability

    const withMinimumLength = (minimumLengthM) => ({
      ...bnd1,
      rules: [
        {
          name: 'minimum-length',
          description: `Is the applied for length at least ${minimumLengthM} m?`,
          config: { minimumLengthM }
        }
      ]
    })

    const requestActions = async (target = parcelId) => {
      const { h, getResponse } = createResponseCapture()

      await ParcelsControllerV2.handler(
        {
          payload: {
            parcelIds: [target],
            fields: ['actions'],
            plannedActions: []
          },
          headers: { 'x-forwarded-authorization': 'dummy' },
          logger,
          server: { postgresDb: connection }
        },
        h
      )

      return getResponse()
    }

    beforeEach(() => {
      mockGetEnabledActions.mockResolvedValue([bnd1])
    })

    test('should offer no ceiling when agreements leave less than the minimum', async () => {
      mockGetEnabledActions.mockResolvedValue([withMinimumLength(20)])
      mockGetAgreements.mockResolvedValue(
        dalAgreement('BND2', perimeterMeters - 9)
      )

      const { data } = await requestActions()

      expect(actionOf(data)).toEqual(
        expect.objectContaining({
          isAvailable: false,
          availability: { unit: 'm', value: 0 },
          unavailableReason: expect.objectContaining({
            code: 'existing-actions-exceed-available-length'
          })
        })
      )
    })

    test('should report a parcel whose whole perimeter is under the minimum as too short', async () => {
      mockGetEnabledActions.mockResolvedValue([
        withMinimumLength(shortPerimeterMeters + 5)
      ])

      const { data } = await requestActions(shortParcelId)

      expect(actionOf(data)).toEqual(
        expect.objectContaining({
          isAvailable: false,
          unavailableReason: expect.objectContaining({
            code: 'parcel-too-short-for-action'
          })
        })
      )
    })

    test('should report the whole perimeter when only an area agreement is recorded', async () => {
      // The parcel carries a live agreement of 251980 sqm; an area never
      // competes for a boundary, whatever its compatibility
      const { data } = await requestActions()

      expect(availabilityOf(data)).toEqual({
        unit: 'm',
        value: perimeterMeters
      })
    })

    test('should deduct an incompatible metre agreement from the perimeter', async () => {
      mockGetAgreements.mockResolvedValue(dalAgreement('BND2', 300))

      const { data } = await requestActions()

      expect(availabilityOf(data)).toEqual({
        unit: 'm',
        value: perimeterMeters - 300
      })
    })

    test('should leave the perimeter intact for a compatible metre agreement', async () => {
      mockGetAgreements.mockResolvedValue(dalAgreement('CNUM1', 300))

      const { data } = await requestActions()

      expect(availabilityOf(data)).toEqual({
        unit: 'm',
        value: perimeterMeters
      })
    })
  })
})
