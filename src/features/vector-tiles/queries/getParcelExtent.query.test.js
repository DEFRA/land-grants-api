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
          min_lng: -2.615462,
          min_lat: 53.919221,
          max_lng: -2.549834,
          max_lat: 53.951681
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
        minLng: -2.615462,
        minLat: 53.919221,
        maxLng: -2.549834,
        maxLat: 53.951681
      }
    })
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  it('returns foundCount 0 and null bbox when nothing matched', async () => {
    mockClient.query.mockResolvedValue({
      rows: [
        {
          found_count: 0,
          min_lng: null,
          min_lat: null,
          max_lng: null,
          max_lat: null
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
          min_lng: '-2.615462',
          min_lat: '53.919221',
          max_lng: '-2.549834',
          max_lat: '53.951681'
        }
      ]
    })

    const result = await getParcelExtent(params, mockDb, mockLogger)

    expect(result.bbox).toEqual({
      minLng: -2.615462,
      minLat: 53.919221,
      maxLng: -2.549834,
      maxLat: 53.951681
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
