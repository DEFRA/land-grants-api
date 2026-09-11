import { vi } from 'vitest'
import { getLandParcelBoundary } from '~/src/features/parcel/queries/getParcelBoundary.query.js'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'

// NY8936-3581 is a 2.3 hectare field in the North Pennines. The expected
// perimeter was measured independently of PostGIS, by summing the straight
// line distance between successive vertices of the parcel's WKT in
// src/land-data/land_parcels/parcels.csv, whose coordinates are British
// National Grid eastings and northings in metres.
//
// land_parcels rows carry SRID 0, so ST_Perimeter returns planar units of an
// undeclared coordinate system - metres here only because the stored
// coordinates happen to be BNG. Were the geometry ever loaded as lat/long the
// perimeter would come back as a fraction of a degree, every available length
// would clamp to zero, and every linear application would fail validation with
// a plausible looking message.
const SHEET_ID = 'NY8936'
const PARCEL_ID = '3581'
const EXPECTED_PERIMETER_METERS = 673

describe('Get Parcel Boundary Query', () => {
  let logger, connection

  beforeAll(() => {
    logger = { info: vi.fn(), error: vi.fn() }
    connection = connectToTestDatabase()
  })

  afterAll(async () => {
    await connection.end()
  })

  test('returns the perimeter of a known parcel in whole metres', async () => {
    const result = await getLandParcelBoundary(
      SHEET_ID,
      PARCEL_ID,
      connection,
      logger
    )

    expect(result.boundaryLengthMeters).toBe(EXPECTED_PERIMETER_METERS)
  })

  test('returns null when the parcel does not exist', async () => {
    const result = await getLandParcelBoundary(
      'ZZ0000',
      '0000',
      connection,
      logger
    )

    expect(result).toBeNull()
  })
})
