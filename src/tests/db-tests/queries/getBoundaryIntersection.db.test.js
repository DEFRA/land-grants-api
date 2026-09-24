import {
  DATA_LAYER_TYPES,
  getBoundaryIntersection
} from '~/src/features/data-layers/queries/getBoundaryIntersection.query.js'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'

describe('Get Boundary Intersection Query', () => {
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

  // Figures are integer metres, verified against the seeded db-test database on 2026-09-17
  const scenarios = [
    [
      'SSSI ends at the field edge: 0% area overlap but 897 m of boundary inside it',
      { sheetId: 'SD6855', parcelId: '7704', layer: 'sssi' },
      { intersectingLengthMeters: 897, boundaryLengthMeters: 3518 }
    ],
    [
      'SSSI covers almost the whole parcel',
      { sheetId: 'SD5649', parcelId: '9215', layer: 'sssi' },
      { intersectingLengthMeters: 22835, boundaryLengthMeters: 23378 }
    ],
    [
      'parcel touches no SSSI',
      { sheetId: 'SD6743', parcelId: '8083', layer: 'sssi' },
      { intersectingLengthMeters: 0, boundaryLengthMeters: 927 }
    ],
    [
      'historic feature covers the whole parcel so the boundary is wholly inside it',
      { sheetId: 'NT9728', parcelId: '0556', layer: 'historic_features' },
      { intersectingLengthMeters: 1734, boundaryLengthMeters: 1734 }
    ],
    [
      'eleven historic features on one parcel',
      { sheetId: 'NZ5500', parcelId: '0465', layer: 'historic_features' },
      { intersectingLengthMeters: 929, boundaryLengthMeters: 10334 }
    ],
    [
      'SSSI features overlap each other along the boundary',
      { sheetId: 'TQ4530', parcelId: '0522', layer: 'sssi' },
      { intersectingLengthMeters: 4714, boundaryLengthMeters: 4714 }
    ],
    [
      'historic features overlap each other along the boundary',
      { sheetId: 'NU0014', parcelId: '4582', layer: 'historic_features' },
      { intersectingLengthMeters: 2063, boundaryLengthMeters: 2246 }
    ],
    [
      'boundary shared with many small features is measured in full: unioning the polygons before intersecting loses coincident stretches',
      { sheetId: 'NY1215', parcelId: '1016', layer: 'historic_features' },
      { intersectingLengthMeters: 1554, boundaryLengthMeters: 12468 }
    ]
  ]

  test.each(scenarios)(
    '%s',
    async (_name, { sheetId, parcelId, layer }, expected) => {
      const result = await getBoundaryIntersection(
        sheetId,
        parcelId,
        DATA_LAYER_TYPES[layer],
        connection,
        logger
      )

      expect(result).toEqual(expected)
    }
  )

  // Features in a layer can overlap each other - two SSSI notifications over the
  // same ground, or a SHINE record inside a scheduled monument. Measuring the
  // boundary against each feature and summing counts the shared stretch twice,
  // and can report more boundary inside the layer than the parcel has perimeter.
  test('intersecting length never exceeds the boundary length', async () => {
    const results = await Promise.all(
      scenarios.map(([, { sheetId, parcelId, layer }]) =>
        getBoundaryIntersection(
          sheetId,
          parcelId,
          DATA_LAYER_TYPES[layer],
          connection,
          logger
        )
      )
    )

    for (const { intersectingLengthMeters, boundaryLengthMeters } of results) {
      expect(intersectingLengthMeters).toBeLessThanOrEqual(boundaryLengthMeters)
    }
  })

  test('returns null when the parcel does not exist', async () => {
    const result = await getBoundaryIntersection(
      'XX0000',
      '0000',
      DATA_LAYER_TYPES.sssi,
      connection,
      logger
    )

    expect(result).toBeNull()
  })
})
