import { getCompatibilityMatrix } from '~/src/features/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
import {
  createCompatibilityMatrix,
  createCompatibilityLookups
} from '~/src/features/available-area/compatibilityMatrix.js'

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

  describe('createCompatibilityLookups', () => {
    const supbas = (optionCode, optionCodeCompat) => ({
      optionCode,
      optionCodeCompat,
      type: 'SUPBAS'
    })

    test('reads the whole matrix once', async () => {
      mockGetCompatibilityMatrix.mockResolvedValue([])

      await createCompatibilityLookups(mockLogger, mockDb, ['AB1'])

      expect(mockGetCompatibilityMatrix).toHaveBeenCalledTimes(1)
      expect(mockGetCompatibilityMatrix).toHaveBeenCalledWith(
        mockLogger,
        mockDb
      )
    })

    test('builds the compatibility check from the same rows', async () => {
      mockGetCompatibilityMatrix.mockResolvedValue([
        { optionCode: 'UPL1', optionCodeCompat: 'CMOR1', type: 'BASECO' }
      ])

      const { compatibilityCheckFn } = await createCompatibilityLookups(
        mockLogger,
        mockDb,
        []
      )

      expect(compatibilityCheckFn('CMOR1', 'UPL1')).toBe(true)
      expect(compatibilityCheckFn('UPL1', 'UPL2')).toBe(false)
    })

    test('returns the actions that are a base for a supported supplement', async () => {
      mockGetCompatibilityMatrix.mockResolvedValue([
        supbas('AB1', 'SP1'),
        supbas('AB2', 'SP2')
      ])

      const { actionCodesWithSupplements } = await createCompatibilityLookups(
        mockLogger,
        mockDb,
        ['AB1', 'AB2', 'SP1']
      )

      expect(actionCodesWithSupplements).toEqual(new Set(['AB1']))
    })
  })
})
