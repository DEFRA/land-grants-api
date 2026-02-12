import { vi } from 'vitest'
import { getCompatibilityMatrix } from '~/src/features/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
import { createCompatibilityMatrix } from '~/src/features/available-area/compatibilityMatrix.js'

vi.mock(
  '~/src/features/compatibility-matrix/queries/getCompatibilityMatrix.query.js',
  () => ({
    getCompatibilityMatrix: vi.fn()
  })
)

const mockGetCompatibilityMatrix = vi.mocked(getCompatibilityMatrix)

describe('Compatibility Matrix', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
  const mockDb = {
    connect: vi.fn(() => ({
      query: vi.fn()
    })),
    release: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createCompatibilityMatrix', () => {
    test('should create compatibility function from database results', async () => {
      const codes = ['CMOR1', 'UPL1', 'UPL2']
      const mockCompatibilityData = [
        { optionCode: 'UPL1', optionCodeCompat: 'CMOR1' },
        { optionCode: 'CMOR1', optionCodeCompat: 'UPL1' },
        { optionCode: 'UPL2', optionCodeCompat: 'CMOR1' }
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
        { optionCode: 'UPL1', optionCodeCompat: 'CMOR1' }
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
