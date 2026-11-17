import { ParcelSupplementsControllerV2 } from '~/src/features/parcel/controllers/2.0.0/parcel-supplements.controller.js'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'
import { createResponseCapture } from '~/src/tests/db-tests/setup/utils.js'
import {
  clearCompatibilityMatrix,
  seedCompatibilityMatrix
} from '~/src/tests/db-tests/setup/compatibility-matrix.js'
import { getActionsByLatestVersion } from '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
import { logger } from '~/src/tests/db-tests/setup/testLogger.js'
import { EXCEEDS_BASE_ACTION_AREA } from '~/src/features/parcel/constants/unavailable-reasons.js'

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

  const requestSupplements = async (payload) => {
    const { h, getResponse } = createResponseCapture()

    const response = await ParcelSupplementsControllerV2.handler(
      {
        payload: {
          parcelId: 'SD5649-9215',
          baseAction: { actionCode: 'CLIG3', quantity: 2.5, unit: 'ha' },
          selectedSupplements: [],
          ...payload
        },
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
      selectedSupplements: [
        { actionCode: 'GRH7', quantity: 1.5, unit: 'ha' },
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

  test('should mark a supplement selected for more than the base action unavailable', async () => {
    const { data } = await requestSupplements({
      selectedSupplements: [{ actionCode: 'GRH7', quantity: 3, unit: 'ha' }]
    })

    expect(byCode(data).GRH7.unavailableReason.code).toBe(
      EXCEEDS_BASE_ACTION_AREA
    )
  })

  test('should reject a selected action that is not a supplement of the base action', async () => {
    const response = await requestSupplements({
      selectedSupplements: [{ actionCode: 'GRH12', quantity: 1, unit: 'ha' }]
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
      baseAction: { actionCode: 'GRH7', quantity: 1, unit: 'ha' }
    })

    expect(statusCode).toBe(200)
    expect(data.supplements).toEqual([])
  })
})
