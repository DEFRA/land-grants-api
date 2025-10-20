import {
  getLandCoversForActions,
  getLandCoversForAction
} from '~/src/api/land-cover-codes/queries/getLandCoversForActions.query.js'

describe('getLandCoversForActions', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }

  const mockClient = {
    query: jest.fn(),
    release: jest.fn()
  }

  const mockDb = {
    connect: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.connect.mockResolvedValue(mockClient)
  })

  describe('successful data retrieval', () => {
    it('should return land cover codes for multiple action codes', async () => {
      const actionCodes = ['CMOR1', 'SPM4']
      const mockDbResponse = [
        {
          action_code: 'CMOR1',
          land_cover_code: 'LC001',
          land_cover_class_code: 'LCC001'
        },
        {
          action_code: 'CMOR1',
          land_cover_code: 'LC002',
          land_cover_class_code: 'LCC002'
        },
        {
          action_code: 'SPM4',
          land_cover_code: 'LC003',
          land_cover_class_code: 'LCC003'
        }
      ]

      mockClient.query.mockResolvedValue({ rows: mockDbResponse })

      const result = await getLandCoversForActions(
        actionCodes,
        mockDb,
        mockLogger
      )

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT DISTINCT action_code, land_cover_code, land_cover_class_code'
        ),
        [actionCodes]
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        CMOR1: [
          { landCoverCode: 'LC001', landCoverClassCode: 'LCC001' },
          { landCoverCode: 'LC002', landCoverClassCode: 'LCC002' }
        ],
        SPM4: [{ landCoverCode: 'LC003', landCoverClassCode: 'LCC003' }]
      })
    })

    it('should return land cover codes for single action code', async () => {
      const actionCodes = ['CMOR1']
      const mockDbResponse = [
        {
          action_code: 'CMOR1',
          land_cover_code: 'LC001',
          land_cover_class_code: 'LCC001'
        }
      ]

      mockClient.query.mockResolvedValue({ rows: mockDbResponse })

      const result = await getLandCoversForActions(
        actionCodes,
        mockDb,
        mockLogger
      )

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Connecting to DB to fetch land cover codes for action codes: CMOR1'
      )
      expect(result).toEqual({
        CMOR1: [{ landCoverCode: 'LC001', landCoverClassCode: 'LCC001' }]
      })
    })

    it('should return empty arrays for action codes with no land covers', async () => {
      const actionCodes = ['CMOR1', 'SPM4']
      mockClient.query.mockResolvedValue({ rows: [] })

      const result = await getLandCoversForActions(
        actionCodes,
        mockDb,
        mockLogger
      )

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No land cover codes found for action codes: CMOR1, SPM4'
      )
      expect(result).toEqual({})
    })

    it('should handle null dbResponse', async () => {
      const actionCodes = ['CMOR1']
      mockClient.query.mockResolvedValue(null)

      const result = await getLandCoversForActions(
        actionCodes,
        mockDb,
        mockLogger
      )

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No land cover codes found for action codes: CMOR1'
      )
      expect(result).toEqual({})
    })
  })

  describe('parameter validation', () => {
    it('should return empty object when action codes array is empty', async () => {
      const result = await getLandCoversForActions([], mockDb, mockLogger)

      expect(mockLogger.warn).toHaveBeenCalledWith('No action codes provided')
      expect(mockDb.connect).not.toHaveBeenCalled()
      expect(result).toEqual({})
    })

    it('should return empty object when action codes is not an array', async () => {
      const result = await getLandCoversForActions('CMOR1', mockDb, mockLogger)

      expect(mockLogger.warn).toHaveBeenCalledWith('No action codes provided')
      expect(mockDb.connect).not.toHaveBeenCalled()
      expect(result).toEqual({})
    })

    it('should return empty object when action codes is null', async () => {
      const result = await getLandCoversForActions(null, mockDb, mockLogger)

      expect(mockLogger.warn).toHaveBeenCalledWith('No action codes provided')
      expect(mockDb.connect).not.toHaveBeenCalled()
      expect(result).toEqual({})
    })

    it('should return empty object when action codes is undefined', async () => {
      const result = await getLandCoversForActions(
        undefined,
        mockDb,
        mockLogger
      )

      expect(mockLogger.warn).toHaveBeenCalledWith('No action codes provided')
      expect(mockDb.connect).not.toHaveBeenCalled()
      expect(result).toEqual({})
    })
  })

  describe('error handling', () => {
    it('should handle database connection error', async () => {
      const connectionError = new Error('Database connection failed')
      mockDb.connect.mockRejectedValue(connectionError)

      await expect(
        getLandCoversForActions(['CMOR1'], mockDb, mockLogger)
      ).rejects.toThrow('Database connection failed')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unable to get land cover codes',
        connectionError
      )
      expect(mockClient.release).not.toHaveBeenCalled()
    })

    it('should handle query execution error', async () => {
      const queryError = new Error('Query execution failed')
      mockClient.query.mockRejectedValue(queryError)

      await expect(
        getLandCoversForActions(['CMOR1'], mockDb, mockLogger)
      ).rejects.toThrow('Query execution failed')

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unable to get land cover codes',
        queryError
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    it('should release client even when query fails', async () => {
      const queryError = new Error('Query execution failed')
      mockClient.query.mockRejectedValue(queryError)

      await expect(
        getLandCoversForActions(['CMOR1'], mockDb, mockLogger)
      ).rejects.toThrow()

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    it('should not release client when connection fails', async () => {
      const connectionError = new Error('Connection failed')
      mockDb.connect.mockRejectedValue(connectionError)

      await expect(
        getLandCoversForActions(['CMOR1'], mockDb, mockLogger)
      ).rejects.toThrow()

      expect(mockClient.release).not.toHaveBeenCalled()
    })
  })

  describe('transformation logic', () => {
    it('should correctly group land covers by action code', async () => {
      const actionCodes = ['ACTION1', 'ACTION2', 'ACTION3']
      const mockDbResponse = [
        {
          action_code: 'ACTION1',
          land_cover_code: 'LC001',
          land_cover_class_code: 'LCC001'
        },
        {
          action_code: 'ACTION1',
          land_cover_code: 'LC002',
          land_cover_class_code: 'LCC002'
        },
        {
          action_code: 'ACTION2',
          land_cover_code: 'LC003',
          land_cover_class_code: 'LCC003'
        }
      ]

      mockClient.query.mockResolvedValue({ rows: mockDbResponse })

      const result = await getLandCoversForActions(
        actionCodes,
        mockDb,
        mockLogger
      )

      expect(result).toEqual({
        ACTION1: [
          { landCoverCode: 'LC001', landCoverClassCode: 'LCC001' },
          { landCoverCode: 'LC002', landCoverClassCode: 'LCC002' }
        ],
        ACTION2: [{ landCoverCode: 'LC003', landCoverClassCode: 'LCC003' }],
        ACTION3: []
      })
    })

    it('should initialize empty arrays for all requested action codes', async () => {
      const actionCodes = ['ACTION1', 'ACTION2']
      const mockDbResponse = [
        {
          action_code: 'ACTION1',
          land_cover_code: 'LC001',
          land_cover_class_code: 'LCC001'
        }
      ]

      mockClient.query.mockResolvedValue({ rows: mockDbResponse })

      const result = await getLandCoversForActions(
        actionCodes,
        mockDb,
        mockLogger
      )

      expect(result).toHaveProperty('ACTION1')
      expect(result).toHaveProperty('ACTION2')
      expect(result.ACTION2).toEqual([])
    })
  })

  describe('logging', () => {
    it('should log info messages with correct action codes', async () => {
      const actionCodes = ['CMOR1', 'SPM4']
      mockClient.query.mockResolvedValue({
        rows: [
          {
            action_code: 'CMOR1',
            land_cover_code: 'LC001',
            land_cover_class_code: 'LCC001'
          }
        ]
      })

      await getLandCoversForActions(actionCodes, mockDb, mockLogger)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Connecting to DB to fetch land cover codes for action codes: CMOR1, SPM4'
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Retrieved land cover codes for action codes: CMOR1, SPM4, items: 1'
      )
    })
  })
})

describe('getLandCoversForAction', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }

  const mockClient = {
    query: jest.fn(),
    release: jest.fn()
  }

  const mockDb = {
    connect: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.connect.mockResolvedValue(mockClient)
  })

  describe('successful data retrieval', () => {
    it('should return land cover codes for a single action code', async () => {
      const actionCode = 'CMOR1'
      const mockDbResponse = [
        {
          action_code: 'CMOR1',
          land_cover_code: 'LC001',
          land_cover_class_code: 'LCC001'
        },
        {
          action_code: 'CMOR1',
          land_cover_code: 'LC002',
          land_cover_class_code: 'LCC002'
        }
      ]

      mockClient.query.mockResolvedValue({ rows: mockDbResponse })

      const result = await getLandCoversForAction(
        actionCode,
        mockDb,
        mockLogger
      )

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(result).toEqual([
        { landCoverCode: 'LC001', landCoverClassCode: 'LCC001' },
        { landCoverCode: 'LC002', landCoverClassCode: 'LCC002' }
      ])
    })

    it('should return empty array when no land covers found', async () => {
      const actionCode = 'CMOR1'
      mockClient.query.mockResolvedValue({ rows: [] })

      const result = await getLandCoversForAction(
        actionCode,
        mockDb,
        mockLogger
      )

      expect(result).toEqual([])
    })

    it('should return empty array when action code is not in database', async () => {
      const actionCode = 'CMOR1'
      mockClient.query.mockResolvedValue({ rows: [] })

      const result = await getLandCoversForAction(
        actionCode,
        mockDb,
        mockLogger
      )

      expect(result).toEqual([])
    })
  })

  describe('error handling', () => {
    it('should propagate errors from getLandCoversForActions', async () => {
      const queryError = new Error('Query execution failed')
      mockClient.query.mockRejectedValue(queryError)

      await expect(
        getLandCoversForAction('CMOR1', mockDb, mockLogger)
      ).rejects.toThrow('Query execution failed')
    })
  })

  describe('integration with getLandCoversForActions', () => {
    it('should call getLandCoversForActions with action code as array', async () => {
      const actionCode = 'CMOR1'
      const mockDbResponse = [
        {
          action_code: 'CMOR1',
          land_cover_code: 'LC001',
          land_cover_class_code: 'LCC001'
        }
      ]

      mockClient.query.mockResolvedValue({ rows: mockDbResponse })

      await getLandCoversForAction(actionCode, mockDb, mockLogger)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        ['CMOR1']
      ])
    })
  })
})
