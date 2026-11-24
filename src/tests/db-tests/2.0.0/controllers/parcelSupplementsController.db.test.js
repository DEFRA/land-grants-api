import { ParcelSupplementsControllerV2 } from '~/src/features/parcel/controllers/2.0.0/parcel-supplements.controller.js'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'
import { createResponseCapture } from '~/src/tests/db-tests/setup/utils.js'
import {
  clearCompatibilityMatrix,
  seedCompatibilityMatrix
} from '~/src/tests/db-tests/setup/compatibility-matrix.js'
import { getActionsByLatestVersion } from '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
import { logger } from '~/src/tests/db-tests/setup/testLogger.js'

vi.mock(
  '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
)
const mockGetEnabledActions = vi.mocked(getActionsByLatestVersion)

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

describe('Parcel Supplements Controller 2.0.0', () => {
  const compatibilitySource = 'parcelSupplementsController.db.test'
  let connection

  // Real 2026 rows: CLIG3 is a base for GRH7, GRH8, GRH10 and GRH11.
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
        ['CLIG3', 'SP99']
      ],
      { type: 'SUPBAS' }
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
    mockGetEnabledActions.mockResolvedValue(
      ['CLIG3', 'GRH7', 'GRH8', 'GRH10', 'GRH11', 'GRH12'].map(enabledAction)
    )
  })

  const clig3 = { actionCode: 'CLIG3', quantity: 2.5, unit: 'ha' }

  const requestSupplements = async (payload) => {
    const { h, getResponse } = createResponseCapture()

    const response = await ParcelSupplementsControllerV2.handler(
      {
        payload: {
          sbi: '106284736',
          parcelId: 'SD5649-9215',
          baseActionCode: 'CLIG3',
          plannedActions: [clig3],
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

  test('should return the enabled supplements of the base action for the latest year', async () => {
    const { data, statusCode } = await requestSupplements({})

    expect(statusCode).toBe(200)
    expect(data).toEqual(
      expect.objectContaining({
        message: 'success',
        parcelId: '9215',
        sheetId: 'SD5649',
        baseActionCode: 'CLIG3'
      })
    )
    expect(data.supplements.map((s) => s.code)).toEqual([
      'GRH7',
      'GRH8',
      'GRH10',
      'GRH11'
    ])
    expect(byCode(data).GRH7).toEqual(
      expect.objectContaining({
        availability: { unit: 'ha', value: 2.5 },
        isAvailable: true
      })
    )
  })

  test('should leave selected supplements available up to the whole base action area', async () => {
    const { data } = await requestSupplements({
      plannedActions: [
        clig3,
        {
          actionCode: 'GRH7',
          quantity: 1.5,
          unit: 'ha',
          baseActionCode: 'CLIG3'
        },
        { actionCode: 'GRH8', quantity: 1, unit: 'ha' }
      ]
    })

    for (const supplement of data.supplements) {
      expect(supplement).toEqual(
        expect.objectContaining({
          availability: { unit: 'ha', value: 2.5 },
          isAvailable: true
        })
      )
    }
  })

  // Like /parcels, this reports what is available rather than rejecting the
  // quantity selected; /application/validate checks the quantity
  test('should not reject a supplement selected for more than the base action', async () => {
    const { data, statusCode } = await requestSupplements({
      plannedActions: [clig3, { actionCode: 'GRH7', quantity: 3, unit: 'ha' }]
    })

    expect(statusCode).toBe(200)
    expect(byCode(data).GRH7.unavailableReason).toBeUndefined()
  })

  test('should reject a planned action given a base action it is not a supplement of for the latest year', async () => {
    const response = await requestSupplements({
      plannedActions: [
        clig3,
        {
          actionCode: 'GRH12',
          quantity: 1,
          unit: 'ha',
          baseActionCode: 'CLIG3'
        }
      ]
    })

    expect(response.output.statusCode).toBe(400)
    expect(response.output.payload.message).toBe(
      'GRH12 is not a supplement of CLIG3'
    )
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
      baseActionCode: 'GRH7',
      plannedActions: [{ actionCode: 'GRH7', quantity: 1, unit: 'ha' }]
    })

    expect(statusCode).toBe(200)
    expect(data.supplements).toEqual([])
  })
})
