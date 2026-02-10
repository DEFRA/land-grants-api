import { vi } from 'vitest'
import { getLandCoverDefinitions } from '~/src/features/land-cover-codes/queries/getLandCoverDefinitions.query.js'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'
import { logger } from '~/src/tests/db-tests/setup/testLogger.js'

describe('Get Land Cover Definitions Query', () => {
  let connection

  beforeAll(() => {
    connection = connectToTestDatbase()
  })

  afterAll(async () => {
    await connection.end()
  })

  test('should return empty array when land cover codes array is empty', async () => {
    const result = await getLandCoverDefinitions([], connection, logger)

    expect(result).toStrictEqual([])
  })

  test('should return empty array when land cover codes is not an array', async () => {
    const result = await getLandCoverDefinitions(null, connection, logger)

    expect(result).toStrictEqual([])
  })

  test('should return empty object for missing action code', async () => {
    const landCovers = await getLandCoverDefinitions(
      ['MISSING'],
      connection,
      logger
    )
    expect(landCovers).toEqual([])
  })

  test('should return land cover data for Permanent Grassland 131', async () => {
    const landCovers = await getLandCoverDefinitions(
      ['131'],
      connection,
      logger
    )
    expect(landCovers).toEqual([
      {
        landCoverClassCode: '130',
        landCoverClassDescription: 'Permanent grassland',
        landCoverCode: '131',
        landCoverDescription: 'Permanent grassland',
        landCoverTypeCode: '100',
        landCoverTypeDescription: 'Agricultural area'
      }
    ])
  })

  test('should return land cover data for a list of covers', async () => {
    const landCovers = await getLandCoverDefinitions(
      ['131', '111', '641'],
      connection,
      logger
    )
    expect(landCovers).toEqual([
      {
        landCoverClassCode: '110',
        landCoverClassDescription: 'Arable land',
        landCoverCode: '111',
        landCoverDescription: 'Land lying fallow',
        landCoverTypeCode: '100',
        landCoverTypeDescription: 'Agricultural area'
      },
      {
        landCoverClassCode: '130',
        landCoverClassDescription: 'Permanent grassland',
        landCoverCode: '131',
        landCoverDescription: 'Permanent grassland',
        landCoverTypeCode: '100',
        landCoverTypeDescription: 'Agricultural area'
      },
      {
        landCoverClassCode: '640',
        landCoverClassDescription: 'Natural transport - tracks and gallops',
        landCoverCode: '641',
        landCoverDescription: 'Gallop',
        landCoverTypeCode: '300',
        landCoverTypeDescription: 'Non-agricultural area'
      }
    ])
  })

  test('should skip any missing land covers', async () => {
    const landCovers = await getLandCoverDefinitions(
      ['131', 'MISSING', '641'],
      connection,
      logger
    )
    expect(landCovers).toEqual([
      {
        landCoverClassCode: '130',
        landCoverClassDescription: 'Permanent grassland',
        landCoverCode: '131',
        landCoverDescription: 'Permanent grassland',
        landCoverTypeCode: '100',
        landCoverTypeDescription: 'Agricultural area'
      },
      {
        landCoverClassCode: '640',
        landCoverClassDescription: 'Natural transport - tracks and gallops',
        landCoverCode: '641',
        landCoverDescription: 'Gallop',
        landCoverTypeCode: '300',
        landCoverTypeDescription: 'Non-agricultural area'
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
