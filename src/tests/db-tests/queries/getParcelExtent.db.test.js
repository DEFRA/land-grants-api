import { vi } from 'vitest'
import { getParcelExtent } from '~/src/features/vector-tiles/queries/getParcelExtent.query.js'
import { TRANSFORM_CHECK_TOLERANCE_DEGREES } from '~/src/features/vector-tiles/constants/coordinate-systems.js'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'

// NY8936-3581 is a 2.3 hectare field in the North Pennines. The expected
// bounding box was measured against a database with the OSTN15 grid installed,
// so this fails both if the grid goes missing and if the SRIDs in the query are
// wrong - neither of which the mocked unit tests can detect, since they never
// execute the SQL.
const PARCEL = { sheetIds: ['NY8936'], parcelKeys: ['3581'] }
const EXPECTED_BBOX = {
  minLng: -2.169038184133289,
  minLat: 54.72538177864165,
  maxLng: -2.165030493441948,
  maxLat: 54.72694658900314
}

const PRECISION = -Math.log10(TRANSFORM_CHECK_TOLERANCE_DEGREES)

describe('Get Parcel Extent Query', () => {
  let logger, connection

  beforeAll(() => {
    logger = { info: vi.fn(), error: vi.fn() }
    connection = connectToTestDatabase()
  })

  afterAll(async () => {
    await connection.end()
  })

  test('returns the WGS84 bounding box of a known parcel', async () => {
    const { foundCount, bbox } = await getParcelExtent(
      PARCEL,
      connection,
      logger
    )

    expect(foundCount).toBe(1)
    expect(bbox.minLng).toBeCloseTo(EXPECTED_BBOX.minLng, PRECISION)
    expect(bbox.minLat).toBeCloseTo(EXPECTED_BBOX.minLat, PRECISION)
    expect(bbox.maxLng).toBeCloseTo(EXPECTED_BBOX.maxLng, PRECISION)
    expect(bbox.maxLat).toBeCloseTo(EXPECTED_BBOX.maxLat, PRECISION)
  })

  test('returns no bounding box when the parcel does not exist', async () => {
    const { foundCount, bbox } = await getParcelExtent(
      { sheetIds: ['ZZ0000'], parcelKeys: ['0000'] },
      connection,
      logger
    )

    expect(foundCount).toBe(0)
    expect(bbox).toBeNull()
  })
})
