import { vi } from 'vitest'
import { checkCoordinateTransform } from '~/src/features/vector-tiles/queries/checkCoordinateTransform.query.js'
import {
  TRANSFORM_CHECK_EASTING,
  TRANSFORM_CHECK_NORTHING,
  TRANSFORM_CHECK_EXPECTED_LNG,
  TRANSFORM_CHECK_EXPECTED_LAT,
  TRANSFORM_CHECK_TOLERANCE_DEGREES
} from '~/src/features/vector-tiles/constants/coordinate-systems.js'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'

// Proves the OSTN15 grid is present in the database image. Without it PROJ
// answers with a Helmert approximation instead, which is roughly a metre out
// and raises no error, so only comparing the coordinates detects it.
describe('Check Coordinate Transform Query', () => {
  let logger, connection

  beforeAll(() => {
    logger = { info: vi.fn(), error: vi.fn() }
    connection = connectToTestDatabase()
  })

  afterAll(async () => {
    await connection.end()
  })

  test('transforms British National Grid to WGS84 using OSTN15', async () => {
    const { lng, lat } = await checkCoordinateTransform(
      {
        easting: TRANSFORM_CHECK_EASTING,
        northing: TRANSFORM_CHECK_NORTHING
      },
      connection,
      logger
    )

    expect(lng).toBeCloseTo(
      TRANSFORM_CHECK_EXPECTED_LNG,
      -Math.log10(TRANSFORM_CHECK_TOLERANCE_DEGREES)
    )
    expect(lat).toBeCloseTo(
      TRANSFORM_CHECK_EXPECTED_LAT,
      -Math.log10(TRANSFORM_CHECK_TOLERANCE_DEGREES)
    )
  })
})
