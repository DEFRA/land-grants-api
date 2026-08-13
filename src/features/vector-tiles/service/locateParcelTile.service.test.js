import { locateParcelTile } from './locateParcelTile.service.js'

const WORLD_HALF = 20037508.3427892
const WORLD_SIZE = WORLD_HALF * 2
const MAX_ZOOM = 22

/**
 * Compute the Web Mercator metre bounds of the tile at (z, x, y).
 * Mirrors PostGIS's ST_TileEnvelope semantics.
 */
function tileBounds(z, x, y) {
  const tiles = 2 ** z
  const size = WORLD_SIZE / tiles
  return {
    xmin: -WORLD_HALF + x * size,
    xmax: -WORLD_HALF + (x + 1) * size,
    ymax: WORLD_HALF - y * size,
    ymin: WORLD_HALF - (y + 1) * size
  }
}

describe('locateParcelTile', () => {
  it('gives a high-zoom (small-tile) result for a tiny parcel-sized bbox', () => {
    // 50 m square — typical small parcel extent in Web Mercator. Exact zoom
    // depends on how the bbox aligns to the XYZ grid (boundary straddles
    // force the algorithm one zoom lower at a time), so just assert the
    // returned tile is comfortably zoomed in for a parcel-scale feature.
    const bbox = {
      xmin: -200_000,
      ymin: 6_800_000,
      xmax: -199_950,
      ymax: 6_800_050
    }
    const { z, x, y } = locateParcelTile(bbox)
    const tile = tileBounds(z, x, y)
    const tileSize = tile.xmax - tile.xmin

    expect(z).toBeLessThanOrEqual(MAX_ZOOM)
    expect(z).toBeGreaterThanOrEqual(10)
    // For a 50 m bbox the chosen tile should still be on the order of
    // ~kilometres, not tens of kilometres.
    expect(tileSize).toBeLessThan(5000)
  })

  it('chooses a tile that fully contains the padded bbox', () => {
    const bbox = {
      xmin: -300_000,
      ymin: 6_700_000,
      xmax: -250_000,
      ymax: 6_750_000
    }
    const { z, x, y } = locateParcelTile(bbox)
    const tile = tileBounds(z, x, y)

    expect(tile.xmin).toBeLessThanOrEqual(bbox.xmin)
    expect(tile.xmax).toBeGreaterThanOrEqual(bbox.xmax)
    expect(tile.ymin).toBeLessThanOrEqual(bbox.ymin)
    expect(tile.ymax).toBeGreaterThanOrEqual(bbox.ymax)
  })

  it('returns x and y inside the valid range for the chosen zoom', () => {
    const { z, x, y } = locateParcelTile({
      xmin: -100_000,
      ymin: 6_800_000,
      xmax: -99_000,
      ymax: 6_801_000
    })
    const max = 2 ** z
    expect(x).toBeGreaterThanOrEqual(0)
    expect(y).toBeGreaterThanOrEqual(0)
    expect(x).toBeLessThan(max)
    expect(y).toBeLessThan(max)
  })

  it('returns max zoom for a degenerate (zero-area) bbox', () => {
    const { z } = locateParcelTile({
      xmin: -200_000,
      ymin: 6_800_000,
      xmax: -200_000,
      ymax: 6_800_000
    })
    expect(z).toBe(MAX_ZOOM)
  })

  it('clamps to zoom 0 for a planet-spanning bbox', () => {
    const { z, x, y } = locateParcelTile({
      xmin: -WORLD_HALF,
      ymin: -WORLD_HALF,
      xmax: WORLD_HALF,
      ymax: WORLD_HALF
    })
    expect(z).toBe(0)
    expect(x).toBe(0)
    expect(y).toBe(0)
  })

  it('steps down a zoom level when the bbox straddles a tile boundary', () => {
    // At zoom 14 the tile size is ~2445 m. Build a tiny 200 m bbox spanning
    // a tile boundary at zoom 14.
    const zCandidate = 14
    const tileSize = WORLD_SIZE / 2 ** zCandidate
    const boundary = -WORLD_HALF + 8000 * tileSize
    const bbox = {
      xmin: boundary - 100,
      ymin: 6_800_000,
      xmax: boundary + 100,
      ymax: 6_800_100
    }

    const { z } = locateParcelTile(bbox)
    expect(z).toBeLessThan(zCandidate)
  })

  it('keeps the bbox plus 5% padding inside the returned tile', () => {
    const bbox = {
      xmin: -200_000,
      ymin: 6_800_000,
      xmax: -199_000,
      ymax: 6_801_000
    }
    const { z, x, y } = locateParcelTile(bbox)
    const tile = tileBounds(z, x, y)

    const width = bbox.xmax - bbox.xmin
    const height = bbox.ymax - bbox.ymin
    const padX = width * 0.05
    const padY = height * 0.05

    expect(tile.xmin).toBeLessThanOrEqual(bbox.xmin - padX + 1e-6)
    expect(tile.xmax).toBeGreaterThanOrEqual(bbox.xmax + padX - 1e-6)
    expect(tile.ymin).toBeLessThanOrEqual(bbox.ymin - padY + 1e-6)
    expect(tile.ymax).toBeGreaterThanOrEqual(bbox.ymax + padY - 1e-6)
  })
})
