import { getBoundaryIntersection } from '~/src/features/data-layers/queries/getBoundaryIntersection.query.js'

describe('getBoundaryIntersection', () => {
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

  const sheetId = 'SD6855'
  const parcelId = '7704'
  const dataLayerTypeId = 1

  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.connect.mockResolvedValue(mockClient)
  })

  it('returns integer metres for the boundary and the part of it inside the layer', async () => {
    mockClient.query.mockResolvedValue({
      rows: [{ intersecting_length_meters: 897, boundary_length_meters: 3518 }]
    })

    const result = await getBoundaryIntersection(
      sheetId,
      parcelId,
      dataLayerTypeId,
      mockDb,
      mockLogger
    )

    expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
      sheetId,
      parcelId,
      dataLayerTypeId
    ])
    expect(result).toEqual({
      intersectingLengthMeters: 897,
      boundaryLengthMeters: 3518
    })
  })

  it('returns zero intersecting length when the boundary touches no feature', async () => {
    mockClient.query.mockResolvedValue({
      rows: [{ intersecting_length_meters: 0, boundary_length_meters: 927 }]
    })

    const result = await getBoundaryIntersection(
      sheetId,
      parcelId,
      dataLayerTypeId,
      mockDb,
      mockLogger
    )

    expect(result).toEqual({
      intersectingLengthMeters: 0,
      boundaryLengthMeters: 927
    })
  })

  it('returns null and logs when the parcel is not found', async () => {
    mockClient.query.mockResolvedValue({ rows: [] })

    const result = await getBoundaryIntersection(
      sheetId,
      parcelId,
      dataLayerTypeId,
      mockDb,
      mockLogger
    )

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Land parcel not found' })
      }),
      expect.stringContaining(
        'Database operation failed: Get boundary intersection'
      )
    )
    expect(result).toBeNull()
  })

  it('returns null and logs when the query fails', async () => {
    mockClient.query.mockRejectedValue(new Error('Query execution failed'))

    const result = await getBoundaryIntersection(
      sheetId,
      parcelId,
      dataLayerTypeId,
      mockDb,
      mockLogger
    )

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Query execution failed' })
      }),
      expect.stringContaining(
        'Database operation failed: Get boundary intersection'
      )
    )
    expect(result).toBeNull()
  })

  it('returns null and logs when the connection fails', async () => {
    mockDb.connect.mockRejectedValue(new Error('Database connection failed'))

    const result = await getBoundaryIntersection(
      sheetId,
      parcelId,
      dataLayerTypeId,
      mockDb,
      mockLogger
    )

    expect(mockLogger.error).toHaveBeenCalled()
    expect(mockClient.release).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('releases the client after a failed query', async () => {
    mockClient.query.mockRejectedValue(new Error('Query execution failed'))

    await getBoundaryIntersection(
      sheetId,
      parcelId,
      dataLayerTypeId,
      mockDb,
      mockLogger
    )

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })
})
