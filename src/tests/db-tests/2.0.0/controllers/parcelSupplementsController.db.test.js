import { ParcelSupplementsControllerV2 } from '~/src/features/parcel/controllers/2.0.0/parcel-supplements.controller.js'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'
import { createResponseCapture } from '~/src/tests/db-tests/setup/utils.js'
import {
  clearCompatibilityMatrix,
  seedCompatibilityMatrix
} from '~/src/tests/db-tests/setup/compatibility-matrix.js'
import { getActionsByLatestVersion } from '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
import { getAgreements } from '~/src/services/dal/index.js'
import { logger } from '~/src/tests/db-tests/setup/testLogger.js'

vi.mock('~/src/services/dal/index.js')
vi.mock(
  '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
)
const mockGetEnabledActions = vi.mocked(getActionsByLatestVersion)
const mockGetAgreements = vi.mocked(getAgreements)

const enabledAction = (code, displayOrder) => ({
  enabled: true,
  display: true,
  code,
  description: `${code} description`,
  applicationUnitOfMeasurement: 'ha',
  payment: { ratePerUnitGbp: 10 },
  semanticVersion: '1.0.0',
  displayOrder,
  rules: []
})

// A parcel of 10.0548 ha, all of it permanent grassland (131), which CLIG3,
// CAGF1, GRH7, GRH8 and GRH11 can all use
const parcelId = 'SD6154-8973'
const parcelHa = 10.0548

const ha = (actionCode, quantity) => ({ actionCode, quantity, unit: 'ha' })
const base = ha('CLIG3', 9)
// Every action selected on the parcel: the base action and the others given
const selected = (...others) => ({ plannedActions: [base, ...others] })

describe('Parcel Supplements Controller 2.0.0', () => {
  const compatibilitySource = 'parcelSupplementsController.db.test'
  let connection

  // Real 2026 rows:
  // - CLIG3 is a base for GRH7, GRH8, GRH10 and GRH11
  // - CLIG3 and CAGF1 can share land; CAGF1 has no row with the supplements
  // - GRH7 and GRH11 can stack (SUPCO); GRH7 and GRH8 cannot
  // - SPM3 is a supplement of CLIG3 and of AGF1
  // SP99 is a supplement of CLIG3 that is not an enabled action; GRH12 is a supplement of a 2025 base only.
  beforeAll(async () => {
    connection = connectToTestDatabase()

    await seedCompatibilityMatrix(
      connection,
      compatibilitySource,
      [
        ['CLIG3', 'GRH7'],
        ['CLIG3', 'GRH8'],
        ['CLIG3', 'GRH10'],
        ['CLIG3', 'GRH11'],
        ['CLIG3', 'SP99'],
        ['CLIG3', 'SPM3'],
        ['AGF1', 'SPM3']
      ],
      { type: 'SUPBAS' }
    )
    await seedCompatibilityMatrix(connection, compatibilitySource, [
      ['CLIG3', 'CAGF1'],
      ['CAGF1', 'CLIG3']
    ])
    await seedCompatibilityMatrix(
      connection,
      compatibilitySource,
      [
        ['GRH7', 'GRH11'],
        ['GRH11', 'GRH7']
      ],
      { type: 'SUPCO' }
    )
    await seedCompatibilityMatrix(
      connection,
      compatibilitySource,
      [['CLIG3', 'GRH12']],
      { type: 'SUPBAS', year: 2025 }
    )
  })

  afterAll(async () => {
    await clearCompatibilityMatrix(connection, compatibilitySource)
    await connection.end()
  })

  beforeEach(() => {
    mockGetAgreements.mockResolvedValue({})
    mockGetEnabledActions.mockResolvedValue(
      ['CLIG3', 'CAGF1', 'GRH7', 'GRH8', 'GRH10', 'GRH11', 'GRH12'].map(
        enabledAction
      )
    )
  })

  const requestSupplements = async (payload) => {
    const { h, getResponse } = createResponseCapture()

    const response = await ParcelSupplementsControllerV2.handler(
      {
        payload: {
          sbi: '106284736',
          parcelId,
          baseAction: 'CLIG3',
          plannedActions: [base],
          ...payload
        },
        headers: { 'x-forwarded-authorization': 'defra-id-token' },
        logger,
        server: { postgresDb: connection }
      },
      h
    )

    return getResponse().statusCode ? getResponse() : response
  }

  const byCode = (data) =>
    Object.fromEntries(data.supplements.map((s) => [s.code, s]))

  const availableHa = async (code, payload) => {
    const { data, statusCode } = await requestSupplements(payload)
    expect(statusCode).toBe(200)
    return byCode(data)[code].availability.value
  }

  test('should return the enabled supplements of the base action for the latest year', async () => {
    const { data, statusCode } = await requestSupplements({})

    expect(statusCode).toBe(200)
    expect(data).toEqual(
      expect.objectContaining({
        message: 'success',
        parcelId: '8973',
        sheetId: 'SD6154',
        baseActionCode: 'CLIG3'
      })
    )
    expect(data.supplements.map((s) => s.code)).toEqual([
      'GRH7',
      'GRH8',
      'GRH10',
      'GRH11'
    ])
    expect(data.supplements[0]).not.toHaveProperty('baseActionCodes')
  })

  describe('availability', () => {
    test('is capped at the base action area', async () => {
      expect(parcelHa).toBeGreaterThan(9)
      expect(await availableHa('GRH7', {})).toBe(9)
    })

    test('leaves out the land of another base action the supplement cannot share', async () => {
      // CAGF1 can share CLIG3's land, but not GRH7's
      expect(await availableHa('GRH7', selected(ha('CAGF1', 4)))).toBe(6.0548)
    })

    test('leaves out the land of an existing agreement the supplement cannot share', async () => {
      mockGetAgreements.mockResolvedValue({
        '8973-SD6154': [
          {
            ...ha('CAGF1', 4),
            startDate: new Date('2025-01-01'),
            endDate: new Date('2099-01-01')
          }
        ]
      })

      expect(await availableHa('GRH7', {})).toBe(6.0548)
    })

    test('leaves a supplement what another supplement it cannot stack with leaves of the base', async () => {
      // GRH8 must sit within CLIG3 too, so 9 - 4 ha of CLIG3 is left for GRH7
      expect(await availableHa('GRH7', selected(ha('GRH8', 4)))).toBe(5)
    })

    test('counts both another base action and another supplement', async () => {
      expect(
        await availableHa('GRH7', selected(ha('GRH8', 4), ha('CAGF1', 4)))
      ).toBe(2.0548)
    })

    test('lets supplements that can stack use the whole base action', async () => {
      expect(await availableHa('GRH7', selected(ha('GRH11', 4)))).toBe(9)
    })

    test('counts a supplement against itself, as /parcels does', async () => {
      expect(await availableHa('GRH7', selected(ha('GRH7', 6)))).toBe(3)
    })

    test('leaves a supplement selected on the whole base action nothing', async () => {
      const { data } = await requestSupplements(
        selected({ ...ha('GRH7', 9), baseAction: 'CLIG3' })
      )

      expect(byCode(data).GRH7).toEqual(
        expect.objectContaining({
          availability: { unit: 'ha', value: 0 },
          isAvailable: false
        })
      )
    })

    test('makes a supplement unavailable when the others take all of the base action', async () => {
      const { data } = await requestSupplements(selected(ha('GRH7', 9)))

      expect(byCode(data).GRH8).toEqual(
        expect.objectContaining({
          availability: { unit: 'ha', value: 0 },
          isAvailable: false,
          unavailableReason: expect.objectContaining({
            code: 'no-availability'
          })
        })
      )
      // GRH11 can stack on GRH7, so it still has the whole base
      expect(byCode(data).GRH11.availability.value).toBe(9)
    })
  })

  // On 10 ha, CLIG3 on 7 ha and CAGF1 on 3 ha: GRH7 and GRH8 cannot sit on
  // CAGF1's land, and cannot overlap each other, so they have CLIG3's 7 ha
  // between them
  describe('a base action next to another base action', () => {
    const plannedActions = [ha('CLIG3', 7), ha('CAGF1', 3)]

    test('offers each supplement the whole base action while the other is not selected', async () => {
      const { data } = await requestSupplements({ plannedActions })

      expect(byCode(data).GRH7.availability.value).toBe(7)
      expect(byCode(data).GRH8.availability.value).toBe(7)
    })

    test('offers each supplement what the selection leaves of the base action', async () => {
      const { data } = await requestSupplements({
        plannedActions: [
          ...plannedActions,
          { ...ha('GRH7', 3.5), baseAction: 'CLIG3' }
        ]
      })

      expect(byCode(data).GRH7.availability.value).toBe(3.5)
      expect(byCode(data).GRH8.availability.value).toBe(3.5)
    })
  })

  // SPM3 can sit on CLIG3 or on AGF1; each request asks about one of them
  describe('a supplement of several base actions', () => {
    const plannedActions = [ha('CLIG3', 4), ha('AGF1', 3)]

    beforeEach(() => {
      mockGetEnabledActions.mockResolvedValue(
        ['CLIG3', 'AGF1', 'GRH7', 'SPM3'].map(enabledAction)
      )
    })

    test('is offered only the area of the base action asked about', async () => {
      expect(await availableHa('SPM3', { plannedActions })).toBe(4)
      expect(
        await availableHa('SPM3', { baseAction: 'AGF1', plannedActions })
      ).toBe(3)
    })

    test('selected on another base action leaves this one alone', async () => {
      const { data } = await requestSupplements({
        plannedActions: [
          ...plannedActions,
          { ...ha('SPM3', 3), baseAction: 'AGF1' }
        ]
      })

      // GRH7 and SPM3 cannot overlap, but SPM3 sits on AGF1, not CLIG3
      expect(byCode(data).GRH7.availability.value).toBe(4)
    })

    test('selected on this base action takes its share of it', async () => {
      const { data } = await requestSupplements({
        plannedActions: [
          ...plannedActions,
          { ...ha('SPM3', 3), baseAction: 'CLIG3' }
        ]
      })

      expect(byCode(data).GRH7.availability.value).toBe(1)
    })

    test('is rejected on a base action it is not a supplement of', async () => {
      const response = await requestSupplements({
        plannedActions: [
          ...plannedActions,
          { ...ha('GRH7', 1), baseAction: 'AGF1' }
        ]
      })

      expect(response.output.statusCode).toBe(400)
    })
  })

  // The quantities selected are not rejected here: /application/validate checks them
  test('should not reject the quantity of a selected supplement over the base action', async () => {
    const { data, statusCode } = await requestSupplements(
      selected(ha('GRH7', 12))
    )

    expect(statusCode).toBe(200)
    expect(byCode(data).GRH7.availability.value).toBe(0)
  })

  test('should reject a base action that is not in the planned actions', async () => {
    const response = await requestSupplements({
      baseAction: 'AGF1'
    })

    expect(response.output.statusCode).toBe(400)
  })

  test('should leave out supplements that are enabled but not displayed', async () => {
    mockGetEnabledActions.mockResolvedValue(
      ['CLIG3', 'GRH7', 'GRH8', 'GRH10', 'GRH11'].map((code, displayOrder) => ({
        ...enabledAction(code, displayOrder),
        display: code !== 'GRH10'
      }))
    )

    const { data } = await requestSupplements({})

    expect(data.supplements.map((s) => s.code)).toEqual([
      'GRH7',
      'GRH8',
      'GRH11'
    ])
  })

  test('should return no supplements for a base action without any', async () => {
    const { data, statusCode } = await requestSupplements({
      baseAction: 'GRH7',
      plannedActions: [ha('GRH7', 1)]
    })

    expect(statusCode).toBe(200)
    expect(data.supplements).toEqual([])
  })
})
