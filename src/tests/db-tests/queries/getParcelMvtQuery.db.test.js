import { vi } from 'vitest'
import { VectorTile } from '@mapbox/vector-tile'
import { PbfReader } from 'pbf'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'
import { getParcelMvt } from '~/src/features/vector-tiles/queries/getParcelMvt.query.js'

const PARCEL = { sheetIds: ['NY8936'], parcelKeys: ['3581'] }

// z14 tile containing the NY8936/3581 centroid (-2.16697, 54.72615).
const TILE = { z: 14, x: 8093, y: 5203 }

/**
 * Decode MVT bytes into GeoJSON features with real lon/lat coordinates.
 * Tile geometry is stored in local 0..extent tile space, so toGeoJSON needs
 * the tile's z/x/y to project back to WGS84.
 */
const decodeLayer = (buffer, { z, x, y }, layerName = 'parcels') => {
  const layer = new VectorTile(new PbfReader(buffer)).layers[layerName]
  if (!layer) {
    return { layer: undefined, features: [] }
  }
  const features = []
  for (let i = 0; i < layer.length; i++) {
    features.push(layer.feature(i).toGeoJSON(x, y, z))
  }
  return { layer, features }
}

describe('getParcelMvt', () => {
  let logger, connection

  beforeAll(() => {
    logger = {
      log: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      error: vi.fn()
    }
    connection = connectToTestDatabase()
  })

  afterAll(async () => {
    await connection.end()
  })

  it('should return an MVT containing the requested parcel', async () => {
    const result = await getParcelMvt(
      { ...PARCEL, ...TILE },
      connection,
      logger
    )

    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)

    const { layer, features } = decodeLayer(result, TILE)

    expect(layer.extent).toBe(4096)
    expect(features).toHaveLength(1)
    expect(features[0].properties).toEqual({
      sheet_id: 'NY8936',
      parcel_id: '3581'
    })
  })

  it('should return a polygon positioned at the parcel location', async () => {
    const result = await getParcelMvt(
      { ...PARCEL, ...TILE },
      connection,
      logger
    )
    const { features } = decodeLayer(result, TILE)
    const { geometry } = features[0]

    expect(['Polygon', 'MultiPolygon']).toContain(geometry.type)

    const ring =
      geometry.type === 'Polygon'
        ? geometry.coordinates[0]
        : geometry.coordinates[0][0]

    expect(ring.length).toBeGreaterThan(3)

    // Every vertex should land within the NY8936 neighbourhood, which proves
    // the 27700 -> 3857 transform in the query is correct.
    for (const [lon, lat] of ring) {
      expect(lon).toBeGreaterThan(-2.2)
      expect(lon).toBeLessThan(-2.1)
      expect(lat).toBeGreaterThan(54.7)
      expect(lat).toBeLessThan(54.75)
    }
  })

  it('should return an empty buffer for a tile the parcel does not touch', async () => {
    const result = await getParcelMvt(
      { ...PARCEL, z: 14, x: 1, y: 1 },
      connection,
      logger
    )

    expect(result).toHaveLength(0)
  })

  it('should return an empty buffer when the parcel does not exist', async () => {
    const result = await getParcelMvt(
      { sheetIds: ['ZZ0000'], parcelKeys: ['0000'], ...TILE },
      connection,
      logger
    )

    expect(result).toHaveLength(0)
  })
})
