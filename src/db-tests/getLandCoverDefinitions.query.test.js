import { getLandCoverDefinitions } from '../api/land-cover-codes/queries/getLandCoverDefinitions.query.js'
import { connectToTestDatbase } from './setup/postgres.js'
import { vi } from 'vitest'

describe('Get land cover definitions query', () => {
  let logger, connection

  beforeAll(() => {
    logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }
    connection = connectToTestDatbase()
  })

  afterAll(async () => {
    await connection.end()
  })

  beforeEach(() => {
    logger.info.mockClear()
    logger.warn.mockClear()
    logger.error.mockClear()
  })

  test('should return empty array when land cover codes array is empty', async () => {
    const landCoverCodes = []

    const result = await getLandCoverDefinitions(
      landCoverCodes,
      connection,
      logger
    )

    expect(result).toStrictEqual([])
  })

  test('should return empty array when land cover codes is not an array', async () => {
    const landCoverCodes = null

    const result = await getLandCoverDefinitions(
      landCoverCodes,
      connection,
      logger
    )

    expect(result).toStrictEqual([])
  })

  test('should return empty array when no matching land cover codes found', async () => {
    const landCoverCodes = ['NONEXISTENT']

    const result = await getLandCoverDefinitions(
      landCoverCodes,
      connection,
      logger
    )

    expect(result).toStrictEqual([])
  })

  test('should return land cover definitions when valid land cover code is provided', async () => {
    const landCoverCodes = ['131']

    const result = await getLandCoverDefinitions(
      landCoverCodes,
      connection,
      logger
    )

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      landCoverClassCode: '130',
      landCoverClassDescription: 'Permanent grassland',
      landCoverCode: '131',
      landCoverDescription: 'Permanent grassland',
      landCoverTypeCode: '100',
      landCoverTypeDescription: 'Agricultural area'
    })
  })

  test('should return land cover definitions when valid land cover class code is provided', async () => {
    const landCoverClassCodes = ['130']

    const result = await getLandCoverDefinitions(
      landCoverClassCodes,
      connection,
      logger
    )

    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toMatchObject({
      landCoverClassCode: '130',
      landCoverClassDescription: 'Permanent grassland',
      landCoverCode: '131',
      landCoverDescription: 'Permanent grassland',
      landCoverTypeCode: '100',
      landCoverTypeDescription: 'Agricultural area'
    })
  })

  test('should return multiple land cover definitions when multiple valid codes are provided', async () => {
    const landCoverCodes = ['140', '131', '132']

    const result = await getLandCoverDefinitions(
      landCoverCodes,
      connection,
      logger
    )

    expect(result).toEqual([
      {
        landCoverClassCode: '130',
        landCoverClassDescription: 'Permanent grassland',
        landCoverCode: '131',
        landCoverDescription: 'Permanent grassland',
        landCoverTypeCode: '100',
        landCoverTypeDescription: 'Agricultural area'
      },
      {
        landCoverClassCode: '130',
        landCoverClassDescription: 'Permanent grassland',
        landCoverCode: '132',
        landCoverDescription: 'Permanent grassland - buffer',
        landCoverTypeCode: '100',
        landCoverTypeDescription: 'Agricultural area'
      },
      {
        landCoverClassCode: '140',
        landCoverClassDescription: 'Permanent crops',
        landCoverCode: '141',
        landCoverDescription: 'Perennial crops',
        landCoverTypeCode: '100',
        landCoverTypeDescription: 'Agricultural area'
      },
      {
        landCoverClassCode: '140',
        landCoverClassDescription: 'Permanent crops',
        landCoverCode: '142',
        landCoverDescription: 'Nurseries',
        landCoverTypeCode: '100',
        landCoverTypeDescription: 'Agricultural area'
      },
      {
        landCoverClassCode: '140',
        landCoverClassDescription: 'Permanent crops',
        landCoverCode: '143',
        landCoverDescription: 'Short rotation coppice',
        landCoverTypeCode: '100',
        landCoverTypeDescription: 'Agricultural area'
      }
    ])
  })

  test('should handle database connection errors', async () => {
    const landCoverCodes = ['131']
    const mockDb = {
      connect: vi.fn().mockRejectedValue(new Error('Connection failed'))
    }

    await expect(
      getLandCoverDefinitions(landCoverCodes, mockDb, logger)
    ).rejects.toThrow('Connection failed')
  })

  test('should handle database query errors and release client', async () => {
    const landCoverCodes = ['131']
    const mockClient = {
      query: vi.fn().mockRejectedValue(new Error('Query failed')),
      release: vi.fn()
    }
    const mockDb = {
      connect: vi.fn().mockResolvedValue(mockClient)
    }

    await expect(
      getLandCoverDefinitions(landCoverCodes, mockDb, logger)
    ).rejects.toThrow('Query failed')
  })
})
