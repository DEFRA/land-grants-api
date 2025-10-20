import { getLandCoverDefinitions } from '~/src/api/land-cover-codes/queries/getLandCoverDefinitions.query.js'

describe('getLandCoverDefinitions', () => {
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
    it('should return land cover definitions for multiple land cover codes', async () => {
      const landCoverCodes = ['LC001', 'LC002']
      const mockDbResponse = [
        {
          land_cover_type_code: 'LCT001',
          land_cover_type_description: 'Type 1',
          land_cover_class_code: 'LCC001',
          land_cover_class_description: 'Class 1',
          land_cover_code: 'LC001',
          land_cover_description: 'Cover 1',
          land_use_code: 'LU001',
          land_use_description: 'Use 1'
        },
        {
          land_cover_type_code: 'LCT002',
          land_cover_type_description: 'Type 2',
          land_cover_class_code: 'LCC002',
          land_cover_class_description: 'Class 2',
          land_cover_code: 'LC002',
          land_cover_description: 'Cover 2',
          land_use_code: 'LU002',
          land_use_description: 'Use 2'
        }
      ]

      mockClient.query.mockResolvedValue({ rows: mockDbResponse })

      const result = await getLandCoverDefinitions(
        landCoverCodes,
        mockDb,
        mockLogger
      )

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT DISTINCT land_cover_type_code'),
        [landCoverCodes]
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(result).toEqual([
        {
          landCoverCode: 'LC001',
          landCoverClassCode: 'LCC001',
          landCoverTypeCode: 'LCT001',
          landCoverTypeDescription: 'Type 1',
          landCoverClassDescription: 'Class 1',
          landCoverDescription: 'Cover 1'
        },
        {
          landCoverCode: 'LC002',
          landCoverClassCode: 'LCC002',
          landCoverTypeCode: 'LCT002',
          landCoverTypeDescription: 'Type 2',
          landCoverClassDescription: 'Class 2',
          landCoverDescription: 'Cover 2'
        }
      ])
    })

    it('should return land cover definitions for single land cover code', async () => {
      const landCoverCodes = ['LC001']
      const mockDbResponse = [
        {
          land_cover_type_code: 'LCT001',
          land_cover_type_description: 'Type 1',
          land_cover_class_code: 'LCC001',
          land_cover_class_description: 'Class 1',
          land_cover_code: 'LC001',
          land_cover_description: 'Cover 1',
          land_use_code: 'LU001',
          land_use_description: 'Use 1'
        }
      ]

      mockClient.query.mockResolvedValue({ rows: mockDbResponse })

      const result = await getLandCoverDefinitions(
        landCoverCodes,
        mockDb,
        mockLogger
      )

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Connecting to DB to fetch land cover definitions for land cover codes: LC001'
      )
      expect(result).toEqual([
        {
          landCoverCode: 'LC001',
          landCoverClassCode: 'LCC001',
          landCoverTypeCode: 'LCT001',
          landCoverTypeDescription: 'Type 1',
          landCoverClassDescription: 'Class 1',
          landCoverDescription: 'Cover 1'
        }
      ])
    })

    it('should return empty array when no land cover definitions found', async () => {
      const landCoverCodes = ['LC001']
      mockClient.query.mockResolvedValue({ rows: [] })

      const result = await getLandCoverDefinitions(
        landCoverCodes,
        mockDb,
        mockLogger
      )

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No land cover codes found for land cover codes: LC001'
      )
      expect(result).toEqual([])
    })

    it('should handle null dbResponse', async () => {
      const landCoverCodes = ['LC001']
      mockClient.query.mockResolvedValue(null)

      const result = await getLandCoverDefinitions(
        landCoverCodes,
        mockDb,
        mockLogger
      )

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No land cover codes found for land cover codes: LC001'
      )
      expect(result).toEqual([])
    })

    it('should handle land cover class codes as well as land cover codes', async () => {
      const landCoverCodes = ['LCC001']
      const mockDbResponse = [
        {
          land_cover_type_code: 'LCT001',
          land_cover_type_description: 'Type 1',
          land_cover_class_code: 'LCC001',
          land_cover_class_description: 'Class 1',
          land_cover_code: 'LC001',
          land_cover_description: 'Cover 1',
          land_use_code: 'LU001',
          land_use_description: 'Use 1'
        },
        {
          land_cover_type_code: 'LCT001',
          land_cover_type_description: 'Type 1',
          land_cover_class_code: 'LCC001',
          land_cover_class_description: 'Class 1',
          land_cover_code: 'LC002',
          land_cover_description: 'Cover 2',
          land_use_code: 'LU002',
          land_use_description: 'Use 2'
        }
      ]

      mockClient.query.mockResolvedValue({ rows: mockDbResponse })

      const result = await getLandCoverDefinitions(
        landCoverCodes,
        mockDb,
        mockLogger
      )

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE land_cover_code = ANY ($1)'),
        [landCoverCodes]
      )
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('OR land_cover_class_code = ANY ($1)'),
        [landCoverCodes]
      )
      expect(result).toHaveLength(2)
    })
  })

  describe('parameter validation', () => {
    it('should return empty array when land cover codes array is empty', async () => {
      const result = await getLandCoverDefinitions([], mockDb, mockLogger)

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No land cover codes provided'
      )
      expect(mockDb.connect).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })

    it('should return empty array when land cover codes is not an array', async () => {
      const result = await getLandCoverDefinitions('LC001', mockDb, mockLogger)

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No land cover codes provided'
      )
      expect(mockDb.connect).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })

    it('should return empty array when land cover codes is null', async () => {
      const result = await getLandCoverDefinitions(null, mockDb, mockLogger)

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No land cover codes provided'
      )
      expect(mockDb.connect).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })

    it('should return empty array when land cover codes is undefined', async () => {
      const result = await getLandCoverDefinitions(
        undefined,
        mockDb,
        mockLogger
      )

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No land cover codes provided'
      )
      expect(mockDb.connect).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })
  })

  describe('error handling', () => {
    it('should handle database connection error', async () => {
      const connectionError = new Error('Database connection failed')
      mockDb.connect.mockRejectedValue(connectionError)

      await expect(
        getLandCoverDefinitions(['LC001'], mockDb, mockLogger)
      ).rejects.toThrow('Database connection failed')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unable to get land cover definitions',
        connectionError
      )
      expect(mockClient.release).not.toHaveBeenCalled()
    })

    it('should handle query execution error', async () => {
      const queryError = new Error('Query execution failed')
      mockClient.query.mockRejectedValue(queryError)

      await expect(
        getLandCoverDefinitions(['LC001'], mockDb, mockLogger)
      ).rejects.toThrow('Query execution failed')

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unable to get land cover definitions',
        queryError
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    it('should release client even when query fails', async () => {
      const queryError = new Error('Query execution failed')
      mockClient.query.mockRejectedValue(queryError)

      await expect(
        getLandCoverDefinitions(['LC001'], mockDb, mockLogger)
      ).rejects.toThrow()

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    it('should not release client when connection fails', async () => {
      const connectionError = new Error('Connection failed')
      mockDb.connect.mockRejectedValue(connectionError)

      await expect(
        getLandCoverDefinitions(['LC001'], mockDb, mockLogger)
      ).rejects.toThrow()

      expect(mockClient.release).not.toHaveBeenCalled()
    })
  })

  describe('transformation logic', () => {
    it('should correctly transform database rows to land cover definitions', async () => {
      const landCoverCodes = ['LC001']
      const mockDbResponse = [
        {
          land_cover_type_code: 'LCT001',
          land_cover_type_description: 'Grassland',
          land_cover_class_code: 'LCC001',
          land_cover_class_description: 'Permanent Grassland',
          land_cover_code: 'LC001',
          land_cover_description: 'Improved Grassland',
          land_use_code: 'LU001',
          land_use_description: 'Agricultural'
        }
      ]

      mockClient.query.mockResolvedValue({ rows: mockDbResponse })

      const result = await getLandCoverDefinitions(
        landCoverCodes,
        mockDb,
        mockLogger
      )

      expect(result[0]).toHaveProperty('landCoverCode', 'LC001')
      expect(result[0]).toHaveProperty('landCoverClassCode', 'LCC001')
      expect(result[0]).toHaveProperty('landCoverTypeCode', 'LCT001')
      expect(result[0]).toHaveProperty('landCoverTypeDescription', 'Grassland')
      expect(result[0]).toHaveProperty(
        'landCoverClassDescription',
        'Permanent Grassland'
      )
      expect(result[0]).toHaveProperty(
        'landCoverDescription',
        'Improved Grassland'
      )
      expect(result[0]).not.toHaveProperty('land_use_code')
      expect(result[0]).not.toHaveProperty('land_use_description')
    })

    it('should handle multiple rows with different land cover codes', async () => {
      const landCoverCodes = ['LC001', 'LC002', 'LC003']
      const mockDbResponse = [
        {
          land_cover_type_code: 'LCT001',
          land_cover_type_description: 'Type 1',
          land_cover_class_code: 'LCC001',
          land_cover_class_description: 'Class 1',
          land_cover_code: 'LC001',
          land_cover_description: 'Cover 1',
          land_use_code: 'LU001',
          land_use_description: 'Use 1'
        },
        {
          land_cover_type_code: 'LCT002',
          land_cover_type_description: 'Type 2',
          land_cover_class_code: 'LCC002',
          land_cover_class_description: 'Class 2',
          land_cover_code: 'LC002',
          land_cover_description: 'Cover 2',
          land_use_code: 'LU002',
          land_use_description: 'Use 2'
        },
        {
          land_cover_type_code: 'LCT003',
          land_cover_type_description: 'Type 3',
          land_cover_class_code: 'LCC003',
          land_cover_class_description: 'Class 3',
          land_cover_code: 'LC003',
          land_cover_description: 'Cover 3',
          land_use_code: 'LU003',
          land_use_description: 'Use 3'
        }
      ]

      mockClient.query.mockResolvedValue({ rows: mockDbResponse })

      const result = await getLandCoverDefinitions(
        landCoverCodes,
        mockDb,
        mockLogger
      )

      expect(result).toHaveLength(3)
      expect(result[0].landCoverCode).toBe('LC001')
      expect(result[1].landCoverCode).toBe('LC002')
      expect(result[2].landCoverCode).toBe('LC003')
    })
  })

  describe('logging', () => {
    it('should log info messages with correct land cover codes', async () => {
      const landCoverCodes = ['LC001', 'LC002']
      mockClient.query.mockResolvedValue({
        rows: [
          {
            land_cover_type_code: 'LCT001',
            land_cover_type_description: 'Type 1',
            land_cover_class_code: 'LCC001',
            land_cover_class_description: 'Class 1',
            land_cover_code: 'LC001',
            land_cover_description: 'Cover 1',
            land_use_code: 'LU001',
            land_use_description: 'Use 1'
          }
        ]
      })

      await getLandCoverDefinitions(landCoverCodes, mockDb, mockLogger)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Connecting to DB to fetch land cover definitions for land cover codes: LC001, LC002'
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Retrieved land covers for land cover definitions: LC001, LC002, items: 1'
      )
    })
  })

  describe('query SQL validation', () => {
    it('should query with WHERE clause checking both land_cover_code and land_cover_class_code', async () => {
      const landCoverCodes = ['LC001']
      mockClient.query.mockResolvedValue({ rows: [] })

      await getLandCoverDefinitions(landCoverCodes, mockDb, mockLogger)

      const queryCalls = mockClient.query.mock.calls[0]
      const sqlQuery = queryCalls[0]

      expect(sqlQuery).toContain('WHERE land_cover_code = ANY ($1)')
      expect(sqlQuery).toContain('OR land_cover_class_code = ANY ($1)')
      expect(queryCalls[1]).toEqual([landCoverCodes])
    })
  })
})
