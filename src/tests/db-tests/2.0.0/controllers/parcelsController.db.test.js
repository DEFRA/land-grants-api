import { ParcelsControllerV2 } from '~/src/features/parcel/controllers/2.0.0/parcels.controller.js'
import { actions } from '~/src/tests/db-tests/fixtures/actions.js'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'
import { createResponseCapture } from '~/src/tests/db-tests/setup/utils.js'
import { getActionsByLatestVersion } from '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
import { getAgreements } from '~/src/services/dal/index.js'
import { logger } from '~/src/tests/db-tests/setup/testLogger.js'
import {
  BOTH_SIDES,
  SINGLE_SIDE,
  billingFactorOf
} from '~/src/features/common/constants/sidedness.js'

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

  const requestParcels = async (parcelIds, fields) => {
    const { h, getResponse } = createResponseCapture()

    await ParcelsControllerV2.handler(
      {
        payload: { parcelIds, fields, plannedActions: [] },
        headers: { 'x-forwarded-authorization': 'dummy' },
        logger,
        server: { postgresDb: connection }
      },
      h
    )

    return getResponse()
  }

  test('should return a 200 status code with groups when groups field is requested', async () => {
    const { data, statusCode } = await requestParcels(
      ['SD5649-9215'],
      ['groups']
    )

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
    const { data, statusCode } = await requestParcels(['SD5649-9215'], ['size'])

    expect(statusCode).toBe(200)
    expect(data.groups).toBeUndefined()
  })

  test('should return a 200 status code and valid parcel when sssiConsentRequired is requested', async () => {
    const { data, statusCode } = await requestParcels(
      ['SD5649-9215'],
      [
        'size',
        'actions',
        'actions.sssiConsentRequired',
        'actions.heferRequired'
      ]
    )

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

    // BND2 is single-side, so it is billed for both faces of the boundary it occupies
    const bnd2Occupying = (occupiedMeters) =>
      dalAgreement('BND2', occupiedMeters * billingFactorOf(SINGLE_SIDE))

    const actionOf = (data) => data.parcels[0].actions[0]
    const availabilityOf = (data) => actionOf(data).availability
    const explanationsOf = (data) => actionOf(data).results.explanations

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

    const requestActions = (target = parcelId) =>
      requestParcels([target], ['actions'])

    const requestActionsWithResults = () =>
      requestParcels([parcelId], ['actions', 'actions.results'])

    // Sidedness reaches the actions table from the grants config, which the db seed does not load
    const SEEDED_SIDEDNESS = { BND1: BOTH_SIDES, BND2: SINGLE_SIDE }

    const insertSeededSidedness = () => {
      const codes = Object.keys(SEEDED_SIDEDNESS)
      const sidedness = Object.values(SEEDED_SIDEDNESS)

      return connection.query(
        'INSERT INTO actions (code, sidedness) SELECT * FROM unnest($1::text[], $2::text[])',
        [codes, sidedness]
      )
    }

    const deleteSeededSidedness = () => {
      const codes = Object.keys(SEEDED_SIDEDNESS)

      return connection.query('DELETE FROM actions WHERE code = ANY ($1)', [
        codes
      ])
    }

    beforeAll(async () => {
      await deleteSeededSidedness()
      await insertSeededSidedness()
    })

    afterAll(async () => {
      await deleteSeededSidedness()
    })

    beforeEach(() => {
      mockGetEnabledActions.mockResolvedValue([bnd1])
    })

    test('should report the failed minimum-length rule when agreements leave less than the minimum', async () => {
      mockGetEnabledActions.mockResolvedValue([withMinimumLength(20)])
      mockGetAgreements.mockResolvedValue(bnd2Occupying(perimeterMeters - 9))

      const { data } = await requestActions()

      expect(actionOf(data)).toEqual(
        expect.objectContaining({
          isAvailable: false,
          availability: { unit: 'm', value: 9 },
          unavailableReason: expect.objectContaining({
            code: 'rule-failed',
            reason:
              'The minimum allowable length for this action (20 m) is more than the available length for this land parcel (9 m)'
          })
        })
      )
    })

    test('should report no availability, rather than too little length, when agreements use the whole perimeter', async () => {
      mockGetEnabledActions.mockResolvedValue([withMinimumLength(20)])
      mockGetAgreements.mockResolvedValue(bnd2Occupying(perimeterMeters))

      const { data } = await requestActions()

      expect(actionOf(data)).toEqual(
        expect.objectContaining({
          isAvailable: false,
          availability: { unit: 'm', value: 0 },
          unavailableReason: expect.objectContaining({
            code: 'no-availability'
          })
        })
      )
    })

    test('should report that existing actions do not fit when agreements exceed the perimeter', async () => {
      mockGetEnabledActions.mockResolvedValue([withMinimumLength(20)])
      mockGetAgreements.mockResolvedValue(bnd2Occupying(perimeterMeters + 1))

      const { data } = await requestActions()

      expect(actionOf(data).unavailableReason).toEqual(
        expect.objectContaining({
          code: 'existing-actions-do-not-fit',
          metadata: {
            existingActions: [
              {
                actionCode: 'BND2',
                billedLengthMeters:
                  (perimeterMeters + 1) * billingFactorOf(SINGLE_SIDE)
              }
            ]
          }
        })
      )
    })

    test('should report the failed minimum-length rule when the whole perimeter is under the minimum', async () => {
      mockGetEnabledActions.mockResolvedValue([
        withMinimumLength(shortPerimeterMeters + 5)
      ])

      const { data } = await requestActions(shortParcelId)

      expect(actionOf(data)).toEqual(
        expect.objectContaining({
          isAvailable: false,
          unavailableReason: expect.objectContaining({
            code: 'rule-failed',
            reason: `The minimum allowable length for this action (${shortPerimeterMeters + 5} m) is more than the available length for this land parcel (${shortPerimeterMeters} m)`
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

    test('should deduct the boundary an incompatible metre agreement occupies from the perimeter', async () => {
      // 300 m of single-side BND2 occupies 150 m of boundary
      mockGetAgreements.mockResolvedValue(dalAgreement('BND2', 300))

      const { data } = await requestActions()

      expect(availabilityOf(data)).toEqual({
        unit: 'm',
        value: perimeterMeters - 150
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

    describe('explanations', () => {
      test('should explain the available length when action results are requested', async () => {
        mockGetAgreements.mockResolvedValue(dalAgreement('BND2', 300))

        const { data } = await requestActionsWithResults()

        expect(explanationsOf(data)).toEqual([
          {
            title: 'Application',
            content: ['Target action: BND1', 'Sidedness: both-sides']
          },
          {
            title: 'Parcel boundary',
            content: [`Parcel boundary: ${perimeterMeters} m`]
          },
          {
            title: 'Existing actions on the boundary',
            content: [
              'BND2: billed 300 m, single-side, occupies 150 m of boundary, deducted'
            ]
          },
          {
            title: 'Result',
            content: [
              'Boundary occupied by incompatible actions: 150 m',
              `Free boundary: ${perimeterMeters - 150} m`,
              `Maximum available length for BND1: ${perimeterMeters - 150} m`
            ]
          }
        ])
      })

      test('should explain why nothing is available when agreements exceed the perimeter', async () => {
        mockGetAgreements.mockResolvedValue(bnd2Occupying(perimeterMeters + 1))

        const { data } = await requestActionsWithResults()

        expect(explanationsOf(data)).toEqual([
          {
            title: 'Application',
            content: ['Target action: BND1', 'Sidedness: both-sides']
          },
          {
            title: 'Parcel boundary',
            content: [`Parcel boundary: ${perimeterMeters} m`]
          },
          {
            title: 'Existing actions on the boundary',
            content: [
              `BND2: billed ${(perimeterMeters + 1) * billingFactorOf(SINGLE_SIDE)} m, single-side, occupies ${perimeterMeters + 1} m of boundary, deducted`
            ]
          },
          {
            title: 'Error - existing actions do not fit',
            content: [
              `The existing actions need ${perimeterMeters + 1} m of boundary however they are arranged, but the parcel boundary is only ${perimeterMeters} m. This requires a manual review and existing agreements may need adjusting.`
            ]
          },
          {
            title: 'Result',
            content: ['Maximum available length for BND1: 0 m']
          }
        ])
      })

      test('should not report results when they are not requested', async () => {
        const { data } = await requestActions()

        expect(actionOf(data).results).toBeUndefined()
      })
    })
  })
})
