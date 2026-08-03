import {
  getLandCoversForAction,
  getLandCoversForActions
} from './getLandCoversForActions.query.js'

describe('getLandCoversForActions', () => {
  let mockDb
  let mockLogger
  let mockClient
  let mockResult
  let testActionCodes

  beforeEach(() => {
    testActionCodes = ['SAM1', 'SAM2', 'SAM3']

    // Mock database result with multiple rows
    mockResult = {
      rows: [
        {
          action_code: 'SAM1',
          land_cover_code: '110',
          land_cover_class_code: '110'
        },
        {
          action_code: 'SAM1',
          land_cover_code: '111',
          land_cover_class_code: '110'
        },
        {
          action_code: 'SAM2',
          land_cover_code: '120',
          land_cover_class_code: '120'
        },
        {
          action_code: 'SAM2',
          land_cover_code: '121',
          land_cover_class_code: '120'
        },
        {
          action_code: 'SAM3',
          land_cover_code: '130',
          land_cover_class_code: '130'
        }
      ]
    }

    mockClient = {
      query: vi.fn().mockResolvedValue(mockResult),
      release: vi.fn()
    }

    mockDb = {
      connect: vi.fn().mockResolvedValue(mockClient)
    }

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('successful operation', () => {
    test('should connect to the database', async () => {
      await getLandCoversForActions(testActionCodes, mockDb, mockLogger)

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
    })

    test('should execute SELECT query with correct SQL and parameters', async () => {
      await getLandCoversForActions(testActionCodes, mockDb, mockLogger)

      const expectedQuery = `
      SELECT DISTINCT action_code, land_cover_code, land_cover_class_code
        FROM public.land_cover_codes_actions
        WHERE action_code = ANY ($1)`

      expect(mockClient.query).toHaveBeenCalledWith(expectedQuery, [
        testActionCodes
      ])
    })

    test('should return land covers grouped by action code', async () => {
      const result = await getLandCoversForActions(
        testActionCodes,
        mockDb,
        mockLogger
      )

      expect(result).toEqual({
        SAM1: [
          { landCoverCode: '110', landCoverClassCode: '110' },
          { landCoverCode: '111', landCoverClassCode: '110' }
        ],
        SAM2: [
          { landCoverCode: '120', landCoverClassCode: '120' },
          { landCoverCode: '121', landCoverClassCode: '120' }
        ],
        SAM3: [{ landCoverCode: '130', landCoverClassCode: '130' }]
      })
    })

    test('should release the client after successful operation', async () => {
      await getLandCoversForActions(testActionCodes, mockDb, mockLogger)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should handle single action code', async () => {
      const singleCode = ['SAM1']
      mockResult.rows = [
        {
          action_code: 'SAM1',
          land_cover_code: '110',
          land_cover_class_code: '110'
        }
      ]

      const result = await getLandCoversForActions(
        singleCode,
        mockDb,
        mockLogger
      )

      expect(result).toEqual({
        SAM1: [{ landCoverCode: '110', landCoverClassCode: '110' }]
      })
    })

    test('should handle many action codes', async () => {
      const manyCodes = Array.from({ length: 50 }, (_, i) => `ACTION${i}`)
      // Create matching rows for all action codes
      mockResult.rows = manyCodes.map((code) => ({
        action_code: code,
        land_cover_code: '110',
        land_cover_class_code: '110'
      }))

      await getLandCoversForActions(manyCodes, mockDb, mockLogger)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        manyCodes
      ])
    })

    test('should log info when land covers are found', async () => {
      await getLandCoversForActions(testActionCodes, mockDb, mockLogger)

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          event: {
            category: 'database',
            action: undefined,
            type: 'info'
          }
        },
        'Get land cover codes for action codes [actionCodes=SAM1,SAM2,SAM3 | items=5]'
      )
    })

    test('should return empty object when no land covers are found', async () => {
      mockResult.rows = []

      const result = await getLandCoversForActions(
        testActionCodes,
        mockDb,
        mockLogger
      )

      expect(result).toEqual({})
      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          event: {
            category: 'validation',
            action: 'Fetch land covers for actions',
            type: 'warn',
            reason: `No land cover codes found for action codes: ${testActionCodes.join(', ')}`
          }
        },
        'Validation failed: Fetch land covers for actions'
      )
    })

    test('should handle action codes with no matching land covers', async () => {
      const codesWithNoMatches = ['NON_EXISTENT1', 'NON_EXISTENT2']
      mockResult.rows = []

      const result = await getLandCoversForActions(
        codesWithNoMatches,
        mockDb,
        mockLogger
      )

      expect(result).toEqual({})
      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should return empty arrays for action codes with no land covers', async () => {
      testActionCodes = ['SAM1', 'SAM2', 'SAM3']
      mockResult.rows = [
        {
          action_code: 'SAM1',
          land_cover_code: '110',
          land_cover_class_code: '110'
        }
      ]

      const result = await getLandCoversForActions(
        testActionCodes,
        mockDb,
        mockLogger
      )

      expect(result).toEqual({
        SAM1: [{ landCoverCode: '110', landCoverClassCode: '110' }],
        SAM2: [],
        SAM3: []
      })
    })

    test('should handle null database result', async () => {
      mockClient.query.mockResolvedValue(null)

      const result = await getLandCoversForActions(
        testActionCodes,
        mockDb,
        mockLogger
      )

      expect(result).toEqual({})
    })

    test('should handle undefined rows in database result', async () => {
      mockClient.query.mockResolvedValue({ rows: undefined })

      const result = await getLandCoversForActions(
        testActionCodes,
        mockDb,
        mockLogger
      )

      expect(result).toEqual({
        SAM1: [],
        SAM2: [],
        SAM3: []
      })
    })

    test('should handle action codes with mixed case', async () => {
      const mixedCaseCodes = ['sam1', 'SAM2', 'SaM3']
      mockResult.rows = mixedCaseCodes.map((code) => ({
        action_code: code,
        land_cover_code: '110',
        land_cover_class_code: '110'
      }))

      await getLandCoversForActions(mixedCaseCodes, mockDb, mockLogger)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        mixedCaseCodes
      ])
    })
  })

  describe('error handling', () => {
    test('should handle database connection error', async () => {
      const connectionError = new Error('Database connection failed')
      mockDb.connect.mockRejectedValue(connectionError)

      await expect(
        getLandCoversForActions(testActionCodes, mockDb, mockLogger)
      ).rejects.toThrow('Database connection failed')

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Database connection failed',
            stack_trace: expect.any(String),
            type: 'Error'
          }),
          event: expect.objectContaining({
            category: 'database',
            action: 'Get land cover codes for action codes',
            type: 'error'
          })
        }),
        'Database operation failed: Get land cover codes for action codes'
      )
      expect(mockClient.release).not.toHaveBeenCalled()
    })

    test('should handle query execution error', async () => {
      const queryError = new Error('SELECT failed')
      mockClient.query.mockRejectedValue(queryError)

      await expect(
        getLandCoversForActions(testActionCodes, mockDb, mockLogger)
      ).rejects.toThrow('SELECT failed')

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'SELECT failed'
          })
        }),
        'Database operation failed: Get land cover codes for action codes'
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should handle database timeout error', async () => {
      const timeoutError = new Error('Query timeout')
      mockClient.query.mockRejectedValue(timeoutError)

      await expect(
        getLandCoversForActions(testActionCodes, mockDb, mockLogger)
      ).rejects.toThrow('Query timeout')

      expect(mockLogger.error).toHaveBeenCalled()
    })

    test('should release client even when query fails', async () => {
      const queryError = new Error('Query execution failed')
      mockClient.query.mockRejectedValue(queryError)

      await expect(
        getLandCoversForActions(testActionCodes, mockDb, mockLogger)
      ).rejects.toThrow()

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should handle table not found error', async () => {
      const tableError = new Error(
        'relation "land_cover_codes_actions" does not exist'
      )
      mockClient.query.mockRejectedValue(tableError)

      await expect(
        getLandCoversForActions(testActionCodes, mockDb, mockLogger)
      ).rejects.toThrow('relation "land_cover_codes_actions" does not exist')

      expect(mockLogger.error).toHaveBeenCalled()
    })

    test('should handle invalid column name error', async () => {
      const columnError = new Error('column "invalid_column" does not exist')
      mockClient.query.mockRejectedValue(columnError)

      await expect(
        getLandCoversForActions(testActionCodes, mockDb, mockLogger)
      ).rejects.toThrow()

      expect(mockLogger.error).toHaveBeenCalled()
    })

    test('should handle network errors', async () => {
      const networkError = new Error('ECONNREFUSED')
      mockDb.connect.mockRejectedValue(networkError)

      await expect(
        getLandCoversForActions(testActionCodes, mockDb, mockLogger)
      ).rejects.toThrow()

      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('parameter validation', () => {
    test('should return empty object when action codes is not an array', async () => {
      const result = await getLandCoversForActions(
        'not-an-array',
        mockDb,
        mockLogger
      )

      expect(result).toEqual({})
      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          event: {
            category: 'validation',
            action: 'Fetch land covers for actions',
            type: 'warn',
            reason: 'No action codes provided'
          }
        },
        'Validation failed: Fetch land covers for actions'
      )
      expect(mockDb.connect).not.toHaveBeenCalled()
    })

    test('should return empty object when action codes is empty array', async () => {
      const result = await getLandCoversForActions([], mockDb, mockLogger)

      expect(result).toEqual({})
      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          event: {
            category: 'validation',
            action: 'Fetch land covers for actions',
            type: 'warn',
            reason: 'No action codes provided'
          }
        },
        'Validation failed: Fetch land covers for actions'
      )
      expect(mockDb.connect).not.toHaveBeenCalled()
    })

    test('should return empty object when action codes is null', async () => {
      const result = await getLandCoversForActions(null, mockDb, mockLogger)

      expect(result).toEqual({})
      expect(mockLogger.warn).toHaveBeenCalled()
      expect(mockDb.connect).not.toHaveBeenCalled()
    })

    test('should return empty object when action codes is undefined', async () => {
      const result = await getLandCoversForActions(
        undefined,
        mockDb,
        mockLogger
      )

      expect(result).toEqual({})
      expect(mockLogger.warn).toHaveBeenCalled()
      expect(mockDb.connect).not.toHaveBeenCalled()
    })

    test('should handle action codes with special characters', async () => {
      const specialCodes = ['SAM-1', 'SAM_2', 'SAM.3']
      mockResult.rows = specialCodes.map((code) => ({
        action_code: code,
        land_cover_code: '110',
        land_cover_class_code: '110'
      }))

      await getLandCoversForActions(specialCodes, mockDb, mockLogger)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        specialCodes
      ])
    })

    test('should handle duplicate action codes in input array', async () => {
      const duplicateCodes = ['SAM1', 'SAM1', 'SAM2', 'SAM2']
      mockResult.rows = [
        {
          action_code: 'SAM1',
          land_cover_code: '110',
          land_cover_class_code: '110'
        }
      ]

      const result = await getLandCoversForActions(
        duplicateCodes,
        mockDb,
        mockLogger
      )

      // Should create separate keys for each occurrence
      expect(result).toHaveProperty('SAM1')
      expect(result).toHaveProperty('SAM2')
    })
  })

  describe('transformation', () => {
    test('should correctly transform database rows to camelCase', async () => {
      const result = await getLandCoversForActions(
        testActionCodes,
        mockDb,
        mockLogger
      )

      Object.values(result).forEach((landCovers) => {
        landCovers.forEach((landCover) => {
          expect(landCover).toHaveProperty('landCoverCode')
          expect(landCover).toHaveProperty('landCoverClassCode')

          // Should not have snake_case properties
          expect(landCover).not.toHaveProperty('land_cover_code')
          expect(landCover).not.toHaveProperty('land_cover_class_code')
        })
      })
    })

    test('should not include action_code in transformed land cover objects', async () => {
      const result = await getLandCoversForActions(
        testActionCodes,
        mockDb,
        mockLogger
      )

      Object.values(result).forEach((landCovers) => {
        landCovers.forEach((landCover) => {
          expect(landCover).not.toHaveProperty('actionCode')
          expect(landCover).not.toHaveProperty('action_code')
        })
      })
    })

    test('should handle null values in database rows', async () => {
      mockResult.rows = [
        {
          action_code: 'SAM1',
          land_cover_code: null,
          land_cover_class_code: '110'
        }
      ]

      const result = await getLandCoversForActions(['SAM1'], mockDb, mockLogger)

      expect(result.SAM1[0]).toEqual({
        landCoverCode: null,
        landCoverClassCode: '110'
      })
    })

    test('should initialize empty arrays for all requested action codes', async () => {
      const requestedCodes = ['SAM1', 'SAM2', 'SAM3', 'SAM4']
      mockResult.rows = [
        {
          action_code: 'SAM1',
          land_cover_code: '110',
          land_cover_class_code: '110'
        }
      ]

      const result = await getLandCoversForActions(
        requestedCodes,
        mockDb,
        mockLogger
      )

      expect(result).toHaveProperty('SAM1')
      expect(result).toHaveProperty('SAM2')
      expect(result).toHaveProperty('SAM3')
      expect(result).toHaveProperty('SAM4')
      expect(result.SAM2).toEqual([])
      expect(result.SAM3).toEqual([])
      expect(result.SAM4).toEqual([])
    })

    test('should group multiple land covers per action correctly', async () => {
      mockResult.rows = [
        {
          action_code: 'SAM1',
          land_cover_code: '110',
          land_cover_class_code: '110'
        },
        {
          action_code: 'SAM1',
          land_cover_code: '111',
          land_cover_class_code: '110'
        }
      ]

      const result = await getLandCoversForActions(['SAM1'], mockDb, mockLogger)

      expect(result.SAM1).toHaveLength(2)
      expect(result.SAM1[0]).toEqual({
        landCoverCode: '110',
        landCoverClassCode: '110'
      })
      expect(result.SAM1[1]).toEqual({
        landCoverCode: '111',
        landCoverClassCode: '110'
      })
    })
  })

  describe('client release', () => {
    test('should release client in finally block even when query succeeds', async () => {
      await getLandCoversForActions(testActionCodes, mockDb, mockLogger)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should release client in finally block even when query fails', async () => {
      mockClient.query.mockRejectedValue(new Error('Test error'))

      await expect(
        getLandCoversForActions(testActionCodes, mockDb, mockLogger)
      ).rejects.toThrow()

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should not call release when client connection fails', async () => {
      mockDb.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(
        getLandCoversForActions(testActionCodes, mockDb, mockLogger)
      ).rejects.toThrow()

      expect(mockClient.release).not.toHaveBeenCalled()
    })

    test('should handle multiple concurrent calls independently', async () => {
      const codes1 = ['SAM1']
      const codes2 = ['SAM2']

      // Reset the mock to return specific results for each call
      let callCount = 0
      mockClient.query.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            rows: [
              {
                action_code: 'SAM1',
                land_cover_code: '110',
                land_cover_class_code: '110'
              }
            ]
          })
        } else {
          return Promise.resolve({
            rows: [
              {
                action_code: 'SAM2',
                land_cover_code: '120',
                land_cover_class_code: '120'
              }
            ]
          })
        }
      })

      await Promise.all([
        getLandCoversForActions(codes1, mockDb, mockLogger),
        getLandCoversForActions(codes2, mockDb, mockLogger)
      ])

      expect(mockDb.connect).toHaveBeenCalledTimes(2)
      expect(mockClient.release).toHaveBeenCalledTimes(2)
    })
  })

  describe('logging', () => {
    test('should not log errors on successful operation with results', async () => {
      await getLandCoversForActions(testActionCodes, mockDb, mockLogger)

      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    test('should log info when land covers are found', async () => {
      await getLandCoversForActions(testActionCodes, mockDb, mockLogger)

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          event: {
            category: 'database',
            action: undefined,
            type: 'info'
          }
        },
        `Get land cover codes for action codes [actionCodes=${testActionCodes.join(',')} | items=${mockResult.rows.length}]`
      )
    })

    test('should log validation warning when no action codes provided', async () => {
      await getLandCoversForActions([], mockDb, mockLogger)

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          event: {
            category: 'validation',
            action: 'Fetch land covers for actions',
            type: 'warn',
            reason: 'No action codes provided'
          }
        },
        'Validation failed: Fetch land covers for actions'
      )
    })

    test('should log validation warning when no land covers found', async () => {
      mockResult.rows = []

      await getLandCoversForActions(testActionCodes, mockDb, mockLogger)

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          event: {
            category: 'validation',
            action: 'Fetch land covers for actions',
            type: 'warn',
            reason: `No land cover codes found for action codes: ${testActionCodes.join(', ')}`
          }
        },
        'Validation failed: Fetch land covers for actions'
      )
    })

    test('should log database errors with correct structure', async () => {
      const error = new Error('Test error')
      mockClient.query.mockRejectedValue(error)

      await expect(
        getLandCoversForActions(testActionCodes, mockDb, mockLogger)
      ).rejects.toThrow()

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Test error',
            stack_trace: expect.any(String),
            type: 'Error'
          }),
          event: expect.objectContaining({
            category: 'database',
            action: 'Get land cover codes for action codes',
            type: 'error'
          })
        }),
        'Database operation failed: Get land cover codes for action codes'
      )
    })
  })
})

describe('getLandCoversForAction', () => {
  let mockDb
  let mockLogger
  let mockClient
  let mockResult
  let testActionCode

  beforeEach(() => {
    testActionCode = 'SAM1'

    // Mock database result
    mockResult = {
      rows: [
        {
          action_code: 'SAM1',
          land_cover_code: '110',
          land_cover_class_code: '110'
        },
        {
          action_code: 'SAM1',
          land_cover_code: '111',
          land_cover_class_code: '110'
        }
      ]
    }

    mockClient = {
      query: vi.fn().mockResolvedValue(mockResult),
      release: vi.fn()
    }

    mockDb = {
      connect: vi.fn().mockResolvedValue(mockClient)
    }

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('successful operation', () => {
    test('should return land covers for single action code', async () => {
      const result = await getLandCoversForAction(
        testActionCode,
        mockDb,
        mockLogger
      )

      expect(result).toEqual([
        { landCoverCode: '110', landCoverClassCode: '110' },
        { landCoverCode: '111', landCoverClassCode: '110' }
      ])
    })

    test('should call getLandCoversForActions with array containing single action code', async () => {
      await getLandCoversForAction(testActionCode, mockDb, mockLogger)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        [testActionCode]
      ])
    })

    test('should return empty array when action code has no land covers', async () => {
      mockResult.rows = []

      const result = await getLandCoversForAction(
        testActionCode,
        mockDb,
        mockLogger
      )

      expect(result).toEqual([])
    })

    test('should return empty array when action code is not found', async () => {
      // Ensure the mock result includes the requested action code but with no matching rows
      mockResult.rows = []

      const result = await getLandCoversForAction(
        'NON_EXISTENT',
        mockDb,
        mockLogger
      )

      expect(result).toEqual([])
    })

    test('should handle single land cover for action', async () => {
      mockResult.rows = [
        {
          action_code: 'SAM1',
          land_cover_code: '110',
          land_cover_class_code: '110'
        }
      ]

      const result = await getLandCoversForAction(
        testActionCode,
        mockDb,
        mockLogger
      )

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        landCoverCode: '110',
        landCoverClassCode: '110'
      })
    })

    test('should handle many land covers for action', async () => {
      mockResult.rows = Array.from({ length: 50 }, (_, i) => ({
        action_code: 'SAM1',
        land_cover_code: `${100 + i}`,
        land_cover_class_code: `${100 + i}`
      }))

      const result = await getLandCoversForAction(
        testActionCode,
        mockDb,
        mockLogger
      )

      expect(result).toHaveLength(50)
    })

    test('should return array type even when empty', async () => {
      mockResult.rows = []

      const result = await getLandCoversForAction(
        testActionCode,
        mockDb,
        mockLogger
      )

      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('error handling', () => {
    test('should throw error when database connection fails', async () => {
      const connectionError = new Error('Database connection failed')
      mockDb.connect.mockRejectedValue(connectionError)

      await expect(
        getLandCoversForAction(testActionCode, mockDb, mockLogger)
      ).rejects.toThrow('Database connection failed')
    })

    test('should throw error when query fails', async () => {
      const queryError = new Error('Query failed')
      mockClient.query.mockRejectedValue(queryError)

      await expect(
        getLandCoversForAction(testActionCode, mockDb, mockLogger)
      ).rejects.toThrow('Query failed')
    })
  })

  describe('parameter validation', () => {
    test('should handle null action code', async () => {
      mockResult.rows = []

      const result = await getLandCoversForAction(null, mockDb, mockLogger)

      expect(result).toEqual([])
      expect(mockLogger.warn).toHaveBeenCalled()
    })

    test('should handle undefined action code', async () => {
      mockResult.rows = []

      const result = await getLandCoversForAction(undefined, mockDb, mockLogger)

      expect(result).toEqual([])
      expect(mockLogger.warn).toHaveBeenCalled()
    })

    test('should handle empty string action code', async () => {
      mockResult.rows = []

      const result = await getLandCoversForAction('', mockDb, mockLogger)

      expect(result).toEqual([])
    })

    test('should handle action code with special characters', async () => {
      const specialCode = 'SAM-1_TEST'
      mockResult.rows = [
        {
          action_code: specialCode,
          land_cover_code: '110',
          land_cover_class_code: '110'
        }
      ]

      const result = await getLandCoversForAction(
        specialCode,
        mockDb,
        mockLogger
      )

      expect(result).toHaveLength(1)
    })
  })

  describe('integration with getLandCoversForActions', () => {
    test('should extract correct action from multi-action result', async () => {
      // The function requests only one action code, so mock DB only returns that one
      mockResult.rows = [
        {
          action_code: 'SAM1',
          land_cover_code: '110',
          land_cover_class_code: '110'
        }
      ]

      const result = await getLandCoversForAction('SAM1', mockDb, mockLogger)

      expect(result).toEqual([
        { landCoverCode: '110', landCoverClassCode: '110' }
      ])
    })

    test('should return empty array when action key does not exist in result', async () => {
      mockResult.rows = []

      const result = await getLandCoversForAction(
        'NON_EXISTENT',
        mockDb,
        mockLogger
      )

      expect(result).toEqual([])
    })
  })

  describe('return value format', () => {
    test('should return array of objects with landCoverCode and landCoverClassCode', async () => {
      const result = await getLandCoversForAction(
        testActionCode,
        mockDb,
        mockLogger
      )

      result.forEach((landCover) => {
        expect(landCover).toHaveProperty('landCoverCode')
        expect(landCover).toHaveProperty('landCoverClassCode')
        expect(Object.keys(landCover)).toHaveLength(2)
      })
    })

    test('should maintain order of land covers from database', async () => {
      const result = await getLandCoversForAction(
        testActionCode,
        mockDb,
        mockLogger
      )

      expect(result[0].landCoverCode).toBe('110')
      expect(result[1].landCoverCode).toBe('111')
    })
  })
})
