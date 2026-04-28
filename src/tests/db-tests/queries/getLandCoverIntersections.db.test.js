import { vi } from 'vitest'
import { getLandCoverIntersections } from '~/src/features/land-covers/queries/getLandCoverIntersections.query.js'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'

describe('Get Land Cover Intersections Query', () => {
  let logger, connection

  beforeAll(() => {
    logger = {
      info: vi.fn(),
      error: vi.fn()
    }
    connection = connectToTestDatbase()
  })

  afterAll(async () => {
    await connection.end()
  })

  // Land parcels intersects with HF only: NU0014-4582
  test('should return HF-only intersections for NU0014-4582', async () => {
    const result = await getLandCoverIntersections(
      'NU0014',
      '4582',
      connection,
      logger
    )

    expect(result).toEqual({
      sssiOverlap: [],
      hfOverlap: [
        { landCoverClassCode: '131', areaSqm: 116265 },
        { landCoverClassCode: '651', areaSqm: 1310 }
      ],
      sssiAndHfOverlap: []
    })
  })

  // Land parcels intersects with SSSI only: SD6351-8781
  test('should return SSSI-only intersections for SD6351-8781', async () => {
    const result = await getLandCoverIntersections(
      'SD6351',
      '8781',
      connection,
      logger
    )

    expect(result).toEqual({
      sssiOverlap: [{ landCoverClassCode: '130', areaSqm: 679583 }],
      hfOverlap: [],
      sssiAndHfOverlap: []
    })
  })

  // Land parcels intersects with SSSI and HF: ST1437-7349
  test('should return both SSSI and HF overlap for ST1437-7349', async () => {
    const result = await getLandCoverIntersections(
      'ST1437',
      '7349',
      connection,
      logger
    )

    expect(result).toEqual({
      sssiOverlap: [
        { landCoverClassCode: '130', areaSqm: 3 },
        { landCoverClassCode: '332', areaSqm: 0 }
      ],
      hfOverlap: [
        { landCoverClassCode: '130', areaSqm: 2 },
        { landCoverClassCode: '332', areaSqm: 0 }
      ],
      sssiAndHfOverlap: [
        { landCoverClassCode: '130', areaSqm: 342488 },
        { landCoverClassCode: '243', areaSqm: 32 },
        { landCoverClassCode: '332', areaSqm: 13981 },
        { landCoverClassCode: '371', areaSqm: 11 }
      ]
    })
  })
})
