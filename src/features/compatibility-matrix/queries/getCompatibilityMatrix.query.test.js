import { getCompatibilityMatrix } from '~/src/features/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
import { compatibilityMatrixTransformer } from '~/src/features/compatibility-matrix/transformers/compatibility-matrix.transformer.js'

describe('getCompatibilityMatrix', () => {
  let mockLogger
  let queryMock
  let releaseMock
  let dbMock

  const cm = {
    id: 1,
    option_code: 'AFC',
    option_code_compat: 'ABC',
    year: 2019,
    type: 'BASECO'
  }

  const queryOf = () => queryMock.mock.calls[0][0]

  beforeEach(() => {
    mockLogger = {
      error: vi.fn(),
      info: vi.fn()
    }

    queryMock = vi.fn().mockResolvedValue({
      rows: [cm]
    })
    releaseMock = vi.fn()
    dbMock = {
      connect: vi.fn().mockResolvedValue({
        query: queryMock,
        release: releaseMock
      })
    }
  })

  test('should select all compatibility matrix', async () => {
    const result = await getCompatibilityMatrix(mockLogger, dbMock)

    expect(result).toEqual([compatibilityMatrixTransformer(cm)])
    expect(dbMock.connect).toHaveBeenCalled()
    expect(queryMock).toHaveBeenCalledWith(expect.any(String), null)
    expect(queryOf()).not.toContain('option_code = ANY ($1)')
    expect(mockLogger.info).toHaveBeenCalledWith(
      {
        event: {
          category: 'database',
          type: 'info'
        }
      },
      'Get compatibility matrix'
    )
  })

  test('should select all compatibility matrix where option code matches', async () => {
    const codes = ['CMOR1']
    const result = await getCompatibilityMatrix(mockLogger, dbMock, codes)

    expect(result).toEqual([compatibilityMatrixTransformer(cm)])
    expect(dbMock.connect).toHaveBeenCalled()
    expect(queryMock).toHaveBeenCalledWith(expect.any(String), [codes])
    expect(queryOf()).toContain('AND option_code = ANY ($1)')
  })

  test('should only select the latest year', async () => {
    await getCompatibilityMatrix(mockLogger, dbMock)

    const query = queryOf()
    expect(query).toMatch(/ORDER BY \(year\)::numeric DESC\s+LIMIT 1/)
    expect(query).toContain('year in (select year from year)')
  })

  test('should only select BASECO compatibility type', async () => {
    await getCompatibilityMatrix(mockLogger, dbMock)

    expect(queryOf()).toContain("AND type = 'BASECO'")
  })

  test('should select the type column', async () => {
    await getCompatibilityMatrix(mockLogger, dbMock)

    expect(queryOf()).toMatch(/year,\s+type\s+FROM compatibility_matrix/)
  })

  test('should transform rows including type', async () => {
    const result = await getCompatibilityMatrix(mockLogger, dbMock)

    expect(result).toEqual([
      {
        id: 1,
        optionCode: 'AFC',
        optionCodeCompat: 'ABC',
        year: 2019,
        type: 'BASECO'
      }
    ])
  })

  test('should release connection', async () => {
    await getCompatibilityMatrix(mockLogger, dbMock)

    expect(releaseMock).toHaveBeenCalled()
  })

  test('should log error when connection fails', async () => {
    const error = new Error('connection failed')
    dbMock.connect.mockRejectedValue(error)

    const result = await getCompatibilityMatrix(mockLogger, dbMock)

    expect(result).toEqual([])
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'connection failed'
        })
      }),
      expect.stringContaining(
        'Database operation failed: Get compatibility matrix'
      )
    )
  })
})
