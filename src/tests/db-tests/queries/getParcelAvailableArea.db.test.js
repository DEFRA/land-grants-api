import { vi } from 'vitest'
import { mockActionConfig } from '~/src/features/actions/fixtures/index.js'
import { getParcelAvailableArea } from '~/src/features/parcel/queries/getParcelAvailableArea.query.js'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'

describe('Get Parcel Available Area Query', () => {
  let logger, connection

  beforeAll(() => {
    logger = {
      info: vi.fn(),
      error: vi.fn()
    }
    connection = connectToTestDatabase()
  })

  afterAll(async () => {
    await connection.end()
  })

  // parameterized tests for various landCoverClassCodes inputs
  test.each([
    ['no landCoverClassCodes provided', 'SD5649', '9215', [], 0],
    [
      'all landCoverClassCodes in the system provided',
      'SD5649',
      '9215',
      Array.from(
        new Set(
          mockActionConfig[0].landCoverClassCodes.concat(['131', '241', '243'])
        )
      ),
      7624624
    ],
    [
      'few landCoverClassCodes in the system provided',
      'SD5649',
      '9215',
      ['551', '131', '130', '551'],
      7624702
    ]
  ])(
    'should return %s',
    async (_desc, sheetId, parcelId, landCoverClassCodes, expected) => {
      const availableArea = await getParcelAvailableArea(
        sheetId,
        parcelId,
        landCoverClassCodes,
        connection,
        logger
      )

      expect(availableArea).toBe(expected)
    }
  )

  test('should return 0 available area when invalid landCoverClassCodes provided', async () => {
    const sheetId = 'SD5649'
    const parcelId = '9215'
    const landCoverClassCodes = ['0000', '9999']

    const availableArea = await getParcelAvailableArea(
      sheetId,
      parcelId,
      landCoverClassCodes,
      connection,
      logger
    )

    expect(availableArea).toBe(0)
  })

  test('should return 0 available area when sheetId not found in the system', async () => {
    const sheetId = 'UD00000'
    const parcelId = '9215'
    const landCoverClassCodes = ['551', '131', '130', '551']

    const availableArea = await getParcelAvailableArea(
      sheetId,
      parcelId,
      landCoverClassCodes,
      connection,
      logger
    )

    expect(availableArea).toBe(0)
  })

  test('should return 0 available area when parcelId not found in the system', async () => {
    const sheetId = 'SD5649'
    const parcelId = '0000'
    const landCoverClassCodes = ['551', '131', '130', '551']

    const availableArea = await getParcelAvailableArea(
      sheetId,
      parcelId,
      landCoverClassCodes,
      connection,
      logger
    )

    expect(availableArea).toBe(0)
  })
})
