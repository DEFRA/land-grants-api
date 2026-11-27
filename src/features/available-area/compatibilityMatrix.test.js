import { getCompatibilityMatrix } from '~/src/features/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
import {
  createValidationLookups,
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

  describe('createValidationLookups', () => {
    test('should read every row once', async () => {
      mockGetCompatibilityMatrix.mockResolvedValue([])

      await createValidationLookups(mockLogger, mockDb)

      expect(mockGetCompatibilityMatrix).toHaveBeenCalledTimes(1)
      expect(mockGetCompatibilityMatrix).toHaveBeenCalledWith(
        mockLogger,
        mockDb
      )
    })

    test('should create a bidirectional compatibility check', async () => {
      mockGetCompatibilityMatrix.mockResolvedValue([
        { optionCode: 'UPL1', optionCodeCompat: 'CMOR1', type: 'BASECO' }
      ])

      const { compatibilityCheckFn } = await createValidationLookups(
        mockLogger,
        mockDb
      )

      expect(compatibilityCheckFn('CMOR1', 'UPL1')).toBe(true)
      expect(compatibilityCheckFn('UPL1', 'CMOR1')).toBe(true)
      expect(compatibilityCheckFn('UPL1', 'UPL2')).toBe(false)
    })

    test('should give the base actions of each supplement', async () => {
      mockGetCompatibilityMatrix.mockResolvedValue([
        { optionCode: 'CLIG3_26', optionCodeCompat: 'GRH7_26', type: 'SUPBAS' },
        { optionCode: 'CLIG3_26', optionCodeCompat: 'SPM3_26', type: 'SUPBAS' },
        { optionCode: 'AGF1_26', optionCodeCompat: 'SPM3_26', type: 'SUPBAS' },
        { optionCode: 'CLIG3_26', optionCodeCompat: 'CAGF1', type: 'BASECO' },
        { optionCode: 'GRH7_26', optionCodeCompat: 'GRH11_26', type: 'SUPCO' }
      ])

      const { baseCodesBySupplement } = await createValidationLookups(
        mockLogger,
        mockDb
      )

      expect(baseCodesBySupplement).toEqual(
        new Map([
          ['GRH7_26', new Set(['CLIG3_26'])],
          ['SPM3_26', new Set(['CLIG3_26', 'AGF1_26'])]
        ])
      )
    })

    test('should propagate errors from getCompatibilityMatrix', async () => {
      mockGetCompatibilityMatrix.mockRejectedValue(
        new Error('Database connection failed')
      )

      await expect(createValidationLookups(mockLogger, mockDb)).rejects.toThrow(
        'Database connection failed'
      )
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
