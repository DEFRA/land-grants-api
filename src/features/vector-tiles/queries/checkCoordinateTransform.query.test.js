import { vi } from 'vitest'
import { checkCoordinateTransform } from './checkCoordinateTransform.query.js'

describe('checkCoordinateTransform', () => {
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

  const params = { easting: 360000, northing: 460000 }

  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.connect.mockResolvedValue(mockClient)
  })

  it('passes the easting and northing as query parameters', async () => {
    mockClient.query.mockResolvedValue({
      rows: [{ lng: -2.612206659804785, lat: 54.03443361534095 }]
    })

    const result = await checkCoordinateTransform(params, mockDb, mockLogger)

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.any(String),
      [360000, 460000]
    )
    expect(result).toEqual({
      lng: -2.612206659804785,
      lat: 54.03443361534095
    })
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  it('coerces numeric strings into numbers', async () => {
    mockClient.query.mockResolvedValue({
      rows: [{ lng: '-2.612206659804785', lat: '54.03443361534095' }]
    })

    const result = await checkCoordinateTransform(params, mockDb, mockLogger)

    expect(result).toEqual({
      lng: -2.612206659804785,
      lat: 54.03443361534095
    })
  })

  it('logs and rethrows when the query fails', async () => {
    mockClient.query.mockRejectedValue(new Error('Query failed'))

    await expect(
      checkCoordinateTransform(params, mockDb, mockLogger)
    ).rejects.toThrow('Query failed')

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Query failed' })
      }),
      expect.stringContaining(
        'Database operation failed: Check coordinate transform'
      )
    )
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  it('does not release the client when connect fails', async () => {
    mockDb.connect.mockRejectedValue(new Error('Connect failed'))

    await expect(
      checkCoordinateTransform(params, mockDb, mockLogger)
    ).rejects.toThrow('Connect failed')

    expect(mockClient.release).not.toHaveBeenCalled()
  })
})
