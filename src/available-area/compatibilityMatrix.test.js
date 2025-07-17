import { getCompatibilityMatrix } from '~/src/api/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
import { createCompatibilityMatrix } from './compatibilityMatrix.js'

jest.mock(
  '~/src/api/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
)

const mockGetCompatibilityMatrix = getCompatibilityMatrix

describe('Compatibility Matrix', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
  const mockDb = {
    connect: jest.fn(() => ({
      query: jest.fn()
    })),
    release: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createCompatibilityMatrix', () => {
    test('should create compatibility function from database results', async () => {
      const codes = ['CMOR1', 'UPL1', 'UPL2']
      const mockCompatibilityData = [
        { option_code: 'UPL1', option_code_compat: 'CMOR1' },
        { option_code: 'CMOR1', option_code_compat: 'UPL1' },
        { option_code: 'UPL2', option_code_compat: 'CMOR1' }
      ]

      mockGetCompatibilityMatrix.mockResolvedValue(mockCompatibilityData)

      const compatibilityFn = await createCompatibilityMatrix(
        mockLogger,
        mockDb,
        codes
      )

      expect(mockGetCompatibilityMatrix).toHaveBeenCalledWith(
        mockLogger,
        mockDb,
        codes
      )
      expect(typeof compatibilityFn).toBe('function')

      expect(compatibilityFn('CMOR1', 'UPL1')).toBe(true)
      expect(compatibilityFn('UPL1', 'CMOR1')).toBe(true)
      expect(compatibilityFn('CMOR1', 'UPL2')).toBe(true)
      expect(compatibilityFn('UPL1', 'UPL2')).toBe(false)
    })

    test('should create a bidirectional compatibility function', async () => {
      const codes = ['CMOR1', 'UPL1']
      const mockCompatibilityData = [
        { option_code: 'UPL1', option_code_compat: 'CMOR1' }
      ]

      mockGetCompatibilityMatrix.mockResolvedValue(mockCompatibilityData)

      const compatibilityFn = await createCompatibilityMatrix(
        mockLogger,
        mockDb,
        codes
      )

      expect(mockGetCompatibilityMatrix).toHaveBeenCalledWith(
        mockLogger,
        mockDb,
        codes
      )
      expect(typeof compatibilityFn).toBe('function')

      expect(compatibilityFn('CMOR1', 'UPL1')).toBe(true)
      expect(compatibilityFn('UPL1', 'CMOR1')).toBe(true)
    })

    test('should return function that returns false when no compatibility data exists', async () => {
      const codes = ['CMOR1', 'UPL1']
      mockGetCompatibilityMatrix.mockResolvedValue([])

      const compatibilityFn = await createCompatibilityMatrix(mockLogger, codes)

      expect(compatibilityFn('CMOR1', 'UPL1')).toBe(false)
      expect(compatibilityFn('UPL1', 'CMOR1')).toBe(false)
    })

    test('should propagate errors from getCompatibilityMatrix', async () => {
      const codes = ['CMOR1', 'UPL1']
      const error = new Error('Database connection failed')
      mockGetCompatibilityMatrix.mockRejectedValue(error)

      await expect(
        createCompatibilityMatrix(mockLogger, codes)
      ).rejects.toThrow('Database connection failed')
    })
  })
})
