import { getLandData } from './land.query.js'

describe('getLandData', () => {
  let mockClient
  let mockLogger
  let mockDb

  beforeAll(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    }

    mockLogger = { error: jest.fn(), info: jest.fn() }
    mockDb = { connect: jest.fn(() => mockClient) }
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should query land_parcels with correct parameters', async () => {
    const mockRows = [{ id: 1, parcel_id: '4115', sheet_id: 'SD7547' }]

    mockClient.query.mockResolvedValue({ rows: mockRows })

    const result = await getLandData('4115', 'SD7547', {
      db: mockDb,
      logger: mockLogger
    })

    expect(mockDb.connect).toHaveBeenCalled()

    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT * FROM land_parcels WHERE parcel_id = $1 and sheet_id = $2',
      ['4115', 'SD7547']
    )
    expect(mockClient.release).toHaveBeenCalled()
    expect(result).toEqual(mockRows)
  })

  it('should log an error and return undefined when db.connect throws', async () => {
    mockDb.connect.mockRejectedValue(new Error('Connection failed'))

    const result = await getLandData('P002', 'S002', {
      db: mockDb,
      logger: mockLogger
    })
    expect(mockLogger.info).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error executing get Land parcels query',
      expect.any(Error)
    )
    expect(result).toBeUndefined()
  })

  it('should log an error and return undefined when client.query throws', async () => {
    mockDb.connect.mockResolvedValue(mockClient)
    mockClient.query.mockRejectedValue(new Error('Query failed'))

    const result = await getLandData('P003', 'S003', {
      db: mockDb,
      logger: mockLogger
    })

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error executing get Land parcels query',
      expect.any(Error)
    )
    expect(result).toBeUndefined()
    expect(mockClient.release).toHaveBeenCalled()
  })
})
