import { jest } from '@jest/globals'
import { getCompatibilityMatrix } from '~/src/api/compatibility-matrix/queries/getCompatibilityMatrix.query.js'

describe('getCompatibilityMatrix', () => {
  const mockLogger = {
    error: jest.fn(),
    info: jest.fn()
  }
  const queryMock = jest.fn()
  const cm = { option_code: 'AFC', option_code_compat: 'ABC', year: 2019 }
  queryMock.mockResolvedValue({
    rows: [cm]
  })
  const releaseMock = jest.fn()
  const dbMock = {
    connect: jest.fn(() => ({
      query: queryMock,
      release: releaseMock
    }))
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should select all compatibility matrix', async () => {
    const result = await getCompatibilityMatrix(mockLogger, dbMock)

    expect(result).toEqual([cm])
    expect(dbMock.connect).toHaveBeenCalled()
    expect(queryMock).toHaveBeenCalledWith('SELECT * FROM compatibility_matrix')
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Connecting to DB to fetch compatibility matrix'
    )
  })

  test('should select all compatibility matrix where option code matches', async () => {
    const codes = ['CMOR1']
    const result = await getCompatibilityMatrix(mockLogger, dbMock, codes)

    expect(result).toEqual([cm])
    expect(dbMock.connect).toHaveBeenCalled()
    expect(queryMock).toHaveBeenCalledWith(
      'SELECT * FROM compatibility_matrix WHERE option_code = ANY ($1)',
      [codes]
    )
  })

  test('should release connection', async () => {
    await getCompatibilityMatrix(mockLogger, dbMock)

    expect(releaseMock).toHaveBeenCalled()
  })

  test('should log error when connection fails', async () => {
    const error = new Error('connection failed')
    dbMock.connect.mockRejectedValue(error)

    const result = await getCompatibilityMatrix(mockLogger, dbMock)

    expect(result).toBeUndefined()
    expect(mockLogger.error).toHaveBeenCalledWith(
      `Error executing get compatibility matrix query: ${error.message}`
    )
  })
})
