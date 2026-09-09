import { getParcelMvt } from './getParcelMvt.query.js'

describe('getParcelMvt', () => {
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
    z: 14,
    x: 8084,
    y: 5258,
    sheetIds: ['SD7547'],
    parcelKeys: ['4115']
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.connect.mockResolvedValue(mockClient)
  })

  it('passes the parcel-key arrays and tile coords as parameters', async () => {
    const tile = Buffer.from([0x1a, 0x05])
    mockClient.query.mockResolvedValue({ rows: [{ tile }] })

    const result = await getParcelMvt(params, mockDb, mockLogger)

    expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
      ['SD7547'],
      ['4115'],
      14,
      8084,
      5258
    ])
    expect(result).toBe(tile)
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  it('returns an empty buffer when no rows intersect', async () => {
    mockClient.query.mockResolvedValue({ rows: [] })

    const result = await getParcelMvt(params, mockDb, mockLogger)

    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBe(0)
  })

  it('returns an empty buffer when the single row has a null tile', async () => {
    mockClient.query.mockResolvedValue({ rows: [{ tile: null }] })

    const result = await getParcelMvt(params, mockDb, mockLogger)

    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBe(0)
  })

  it('wraps a non-Buffer tile payload in a Buffer', async () => {
    mockClient.query.mockResolvedValue({
      rows: [{ tile: new Uint8Array([1, 2, 3]) }]
    })

    const result = await getParcelMvt(params, mockDb, mockLogger)

    expect(Buffer.isBuffer(result)).toBe(true)
    expect(Array.from(result)).toEqual([1, 2, 3])
  })

  it('logs and rethrows when the query fails', async () => {
    const queryError = new Error('Query failed')
    mockClient.query.mockRejectedValue(queryError)

    await expect(getParcelMvt(params, mockDb, mockLogger)).rejects.toThrow(
      'Query failed'
    )

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Query failed' })
      }),
      expect.stringContaining(
        'Database operation failed: Get parcel vector tile'
      )
    )
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  it('releases the client even when connect fails', async () => {
    mockDb.connect.mockRejectedValue(new Error('Connect failed'))

    await expect(getParcelMvt(params, mockDb, mockLogger)).rejects.toThrow(
      'Connect failed'
    )

    expect(mockClient.release).not.toHaveBeenCalled()
  })
})
