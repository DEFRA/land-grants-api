const WORLD_HALF = 20037508.3427892
const WORLD_SIZE = WORLD_HALF * 2
const MAX_ZOOM = 22
const PADDING_RATIO = 0.05
const MIN_EXTENT_METRES = 1

/**
 * @typedef {object} Bbox
 * @property {number} xmin
 * @property {number} ymin
 * @property {number} xmax
 * @property {number} ymax
 */

/**
 * Web Mercator x/y (metres) → tile column/row at zoom z.
 * @param {number} mx
 * @param {number} my
 * @param {number} z
 * @returns {{ x: number, y: number }}
 */
function metresToTile(mx, my, z) {
  const tiles = 2 ** z
  const x = Math.floor(((mx + WORLD_HALF) / WORLD_SIZE) * tiles)
  const y = Math.floor(((WORLD_HALF - my) / WORLD_SIZE) * tiles)
  return {
    x: Math.min(Math.max(x, 0), tiles - 1),
    y: Math.min(Math.max(y, 0), tiles - 1)
  }
}

/**
 * Pick the smallest Web Mercator XYZ tile that contains the given bbox with
 * a fixed percentage of padding on every side.
 * @param {Bbox} bbox  bbox in EPSG:3857 metres
 * @returns {{ z: number, x: number, y: number }}
 */
export function locateParcelTile(bbox) {
  const rawW = bbox.xmax - bbox.xmin
  const rawH = bbox.ymax - bbox.ymin
  const w = Math.max(rawW, MIN_EXTENT_METRES)
  const h = Math.max(rawH, MIN_EXTENT_METRES)

  const paddedW = w * (1 + PADDING_RATIO * 2)
  const paddedH = h * (1 + PADDING_RATIO * 2)

  const longestSide = Math.max(paddedW, paddedH)
  const zForSide = Math.floor(Math.log2(WORLD_SIZE / longestSide))
  let z = Math.min(Math.max(zForSide, 0), MAX_ZOOM)

  const padX = w * PADDING_RATIO
  const padY = h * PADDING_RATIO
  const cornerX = [bbox.xmin - padX, bbox.xmax + padX]
  const cornerY = [bbox.ymin - padY, bbox.ymax + padY]

  while (z > 0) {
    const tiles = cornerX.flatMap((mx) =>
      cornerY.map((my) => metresToTile(mx, my, z))
    )
    const first = tiles[0]
    if (tiles.every((t) => t.x === first.x && t.y === first.y)) {
      return { z, x: first.x, y: first.y }
    }
    z -= 1
  }

  const { x, y } = metresToTile(
    (bbox.xmin + bbox.xmax) / 2,
    (bbox.ymin + bbox.ymax) / 2,
    0
  )
  return { z: 0, x, y }
}
