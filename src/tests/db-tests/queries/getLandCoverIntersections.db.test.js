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
        { landCoverClassCode: '131', areaSqm: 116264.819454647 },
        { landCoverClassCode: '651', areaSqm: 1310.2267694704744 }
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
      sssiOverlap: [{ landCoverClassCode: '130', areaSqm: 679583.0888948763 }],
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
        { landCoverClassCode: '130', areaSqm: 2.725701145042499 },
        { landCoverClassCode: '332', areaSqm: 0.060538366711269546 }
      ],
      hfOverlap: [
        { landCoverClassCode: '130', areaSqm: 2.1504999958029956 },
        { landCoverClassCode: '332', areaSqm: 3.1503694097878565e-10 }
      ],
      sssiAndHfOverlap: [
        { landCoverClassCode: '130', areaSqm: 342488.47529073484 },
        { landCoverClassCode: '243', areaSqm: 31.56999999999651 },
        { landCoverClassCode: '332', areaSqm: 13981.182068099926 },
        { landCoverClassCode: '371', areaSqm: 10.84000000003085 }
      ]
    })
  })
})
