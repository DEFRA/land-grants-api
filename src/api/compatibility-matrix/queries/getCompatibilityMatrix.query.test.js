import { vi, describe, test, beforeEach, expect } from 'vitest'
import { getCompatibilityMatrix } from '~/src/api/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
import { compatibilityMatrixTransformer } from '../transformers/compatibility-matrix.transformer.js'

describe('getCompatibilityMatrix', () => {
  let mockLogger
  let queryMock
  let releaseMock
  let dbMock
  
  const cm = {
    id: 1,
    option_code: 'AFC',
    option_code_compat: 'ABC',
    year: 2019
  }

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
    expect(queryMock).toHaveBeenCalledWith(
      'SELECT * FROM compatibility_matrix ',
      null
    )
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
