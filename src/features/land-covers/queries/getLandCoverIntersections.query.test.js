import { vi } from 'vitest'
import {
  getLandCoverIntersections,
  getIntersectionsExclusiveQuery
} from './getLandCoverIntersections.query.js'

describe('getLandCoverIntersections', () => {
  let mockDb
  let mockLogger
  let mockClient

  beforeEach(() => {
    mockClient = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            land_cover_class_code: '130',
            overlap_type: 'sssi_only',
            area_sqm: 266033.82654810767
          },
          {
            land_cover_class_code: '332',
            overlap_type: 'hf_only',
            area_sqm: 0.00889780191629952
          },
          {
            land_cover_class_code: '651',
            overlap_type: 'sssi_and_hf',
            area_sqm: 485.8957049338928
          }
        ]
      }),
      release: vi.fn()
    }

    mockDb = {
      connect: vi.fn().mockResolvedValue(mockClient)
    }

    mockLogger = {
      info: vi.fn(),
      error: vi.fn()
    }
  })

  test('should connect to the database', async () => {
    await getLandCoverIntersections('TQ4432', '6044', mockDb, mockLogger)

    expect(mockDb.connect).toHaveBeenCalledTimes(1)
  })

  test('should use the intersections query with sheetId and parcelId', async () => {
    await getLandCoverIntersections('TQ4432', '6044', mockDb, mockLogger)

    expect(mockClient.query).toHaveBeenCalledWith(
      getIntersectionsExclusiveQuery,
      ['TQ4432', '6044']
    )
  })

  test('should map query rows into overlap buckets', async () => {
    const result = await getLandCoverIntersections(
      'TQ4432',
      '6044',
      mockDb,
      mockLogger
    )

    expect(result).toStrictEqual({
      sssiOverlap: [
        {
          landCoverClassCode: '130',
          areaSqm: 266034
        }
      ],
      hfOverlap: [
        {
          landCoverClassCode: '332',
          areaSqm: 0
        }
      ],
      sssiAndHfOverlap: [
        {
          landCoverClassCode: '651',
          areaSqm: 486
        }
      ]
    })
  })

  test('should return empty arrays when there are no rows', async () => {
    mockClient.query.mockResolvedValue({ rows: [] })

    const result = await getLandCoverIntersections(
      'TQ4432',
      '6044',
      mockDb,
      mockLogger
    )

    expect(result).toStrictEqual({
      sssiOverlap: [],
      hfOverlap: [],
      sssiAndHfOverlap: []
    })
  })

  test('should ignore unknown overlap types', async () => {
    mockClient.query.mockResolvedValue({
      rows: [
        {
          land_cover_class_code: '999',
          overlap_type: 'unknown_type',
          area_sqm: 123
        }
      ]
    })

    const result = await getLandCoverIntersections(
      'TQ4432',
      '6044',
      mockDb,
      mockLogger
    )

    expect(result).toStrictEqual({
      sssiOverlap: [],
      hfOverlap: [],
      sssiAndHfOverlap: []
    })
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          category: 'database',
          type: 'info'
        })
      }),
      expect.stringContaining('Unknown overlap type ignored')
    )
  })

  test('should handle missing rows safely', async () => {
    mockClient.query.mockResolvedValue({})

    const result = await getLandCoverIntersections(
      'TQ4432',
      '6044',
      mockDb,
      mockLogger
    )

    expect(result).toStrictEqual({
      sssiOverlap: [],
      hfOverlap: [],
      sssiAndHfOverlap: []
    })
  })

  test('should release the client when done', async () => {
    await getLandCoverIntersections('TQ4432', '6044', mockDb, mockLogger)

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle query errors and return empty overlaps', async () => {
    mockClient.query.mockRejectedValue(new Error('Database error'))

    const result = await getLandCoverIntersections(
      'TQ4432',
      '6044',
      mockDb,
      mockLogger
    )

    expect(result).toStrictEqual({
      sssiOverlap: [],
      hfOverlap: [],
      sssiAndHfOverlap: []
    })
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Database error'
        }),
        event: expect.objectContaining({
          category: 'database'
        })
      }),
      expect.stringContaining(
        'Database operation failed: Get land cover intersections'
      )
    )
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle connection errors and not release client', async () => {
    mockDb.connect = vi.fn().mockRejectedValue(new Error('Connection error'))

    const result = await getLandCoverIntersections(
      'TQ4432',
      '6044',
      mockDb,
      mockLogger
    )

    expect(result).toStrictEqual({
      sssiOverlap: [],
      hfOverlap: [],
      sssiAndHfOverlap: []
    })
    expect(mockClient.release).not.toHaveBeenCalled()
    expect(mockLogger.error).toHaveBeenCalled()
  })
})
