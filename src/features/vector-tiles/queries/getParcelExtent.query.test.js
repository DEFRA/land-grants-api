import { getParcelExtent } from './getParcelExtent.query.js'

describe('getParcelExtent', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn()
  }

  const mockClient = {
    query: vi.fn(),
    release: vi.fn()
  }

  const mockDb = {
    connect: vi.fn()
  }

  const params = {
    sheetIds: ['SD7547', 'SD7548'],
    parcelKeys: ['4115', '9']
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.connect.mockResolvedValue(mockClient)
  })

  it('passes the sheet and parcel arrays as query parameters', async () => {
    mockClient.query.mockResolvedValue({
      rows: [
        {
          found_count: 2,
          xmin: -200_000,
          ymin: 6_800_000,
          xmax: -199_000,
          ymax: 6_801_000
        }
      ]
    })

    const result = await getParcelExtent(params, mockDb, mockLogger)

    expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
      ['SD7547', 'SD7548'],
      ['4115', '9']
    ])
    expect(result).toEqual({
      foundCount: 2,
      bbox: {
        xmin: -200_000,
        ymin: 6_800_000,
        xmax: -199_000,
        ymax: 6_801_000
      }
    })
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  it('returns foundCount 0 and null bbox when nothing matched', async () => {
    mockClient.query.mockResolvedValue({
      rows: [
        {
          found_count: 0,
          xmin: null,
          ymin: null,
          xmax: null,
          ymax: null
        }
      ]
    })

    const result = await getParcelExtent(params, mockDb, mockLogger)

    expect(result).toEqual({ foundCount: 0, bbox: null })
  })

  it('returns foundCount 0 when the query returns no rows', async () => {
    mockClient.query.mockResolvedValue({ rows: [] })

    const result = await getParcelExtent(params, mockDb, mockLogger)

    expect(result).toEqual({ foundCount: 0, bbox: null })
  })

  it('coerces numeric strings into numbers', async () => {
    mockClient.query.mockResolvedValue({
      rows: [
        {
          found_count: 1,
          xmin: '-200000.5',
          ymin: '6800000.25',
          xmax: '-199000.75',
          ymax: '6801000.5'
        }
      ]
    })

    const result = await getParcelExtent(params, mockDb, mockLogger)

    expect(result.bbox).toEqual({
      xmin: -200_000.5,
      ymin: 6_800_000.25,
      xmax: -199_000.75,
      ymax: 6_801_000.5
    })
  })

  it('logs and rethrows when the query fails', async () => {
    const queryError = new Error('Query failed')
    mockClient.query.mockRejectedValue(queryError)

    await expect(getParcelExtent(params, mockDb, mockLogger)).rejects.toThrow(
      'Query failed'
    )

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Query failed' })
      }),
      expect.stringContaining('Database operation failed: Get parcel extent')
    )
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  it('does not release the client when connect fails', async () => {
    mockDb.connect.mockRejectedValue(new Error('Connect failed'))

    await expect(getParcelExtent(params, mockDb, mockLogger)).rejects.toThrow(
      'Connect failed'
    )

    expect(mockClient.release).not.toHaveBeenCalled()
  })
})
