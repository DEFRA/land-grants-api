import { getParcelAvailableArea } from './getParcelAvailableArea.query.js'
import { Pool } from 'pg'

describe('getParcelAvailableArea', () => {
  const sheetId = 'S001'
  const parcelId = 'P123'
  const landCoverClassCodes = ['131']

  const pool = new Pool()

  const mockLogger = {
    error: jest.fn(),
    info: jest.fn()
  }
  let mockClient

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    }

    jest.spyOn(pool, 'connect').mockResolvedValue(mockClient)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('returns area when query succeeds', async () => {
    mockClient.query.mockResolvedValue({
      rows: [{ total_land_cover_area: '1234.56' }]
    })

    const result = await getParcelAvailableArea(
      sheetId,
      parcelId,
      landCoverClassCodes,
      pool,
      mockLogger
    )

    expect(result).toBeCloseTo(1234.56)
    expect(mockClient.query).toHaveBeenCalledTimes(1)
  })

  it('returns 0 if no area is returned', async () => {
    mockClient.query.mockResolvedValue({
      rows: [{ total_land_cover_area: null }]
    })

    const result = await getParcelAvailableArea(
      sheetId,
      parcelId,
      landCoverClassCodes,
      pool,
      mockLogger
    )

    expect(result).toBe(0)
  })

  it('throws an error when query fails', async () => {
    mockClient.query.mockRejectedValue(new Error('DB connection error'))

    await expect(
      getParcelAvailableArea(
        sheetId,
        parcelId,
        landCoverClassCodes,
        pool,
        mockLogger
      )
    ).rejects.toThrow('DB connection error')
  })
})
