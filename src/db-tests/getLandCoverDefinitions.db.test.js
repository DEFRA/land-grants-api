import { getLandCoverDefinitions } from '../api/land-cover-codes/queries/getLandCoverDefinitions.query.js'
import {
  connectToTestDatbase,
  resetDatabase,
  seedPostgres
} from './setup/postgres.js'
import { logger } from './testLogger.js'

let connection

describe('Get land cover definitions', () => {
  beforeAll(async () => {
    connection = await connectToTestDatbase()
    await seedPostgres(connection, {
      parcels: false,
      covers: false,
      moorland: false,
      landCoverCodes: true,
      landCoverCodesActions: true
    })
  }, 60000)

  afterAll(async () => {
    await resetDatabase(connection)
    await connection.end()
  })

  test('should return empty object for missing action code', async () => {
    const landCovers = await getLandCoverDefinitions(
      ['MISSING'],
      connection,
      logger
    )
    expect(landCovers).toEqual({})
  })

  test('should return land cover data for Permanent Grassland 131', async () => {
    const landCovers = await getLandCoverDefinitions(
      ['131'],
      connection,
      logger
    )
    expect(landCovers).toEqual({
      131: {
        landCoverClassCode: '130',
        landCoverClassDescription: 'Permanent grassland',
        landCoverCode: '131',
        landCoverDescription: 'Permanent grassland',
        landCoverTypeCode: '100',
        landCoverTypeDescription: 'Agricultural area'
      }
    })
  })

  test('should return land cover data for a list of covers', async () => {
    const landCovers = await getLandCoverDefinitions(
      ['131', '111', '641'],
      connection,
      logger
    )
    expect(landCovers).toEqual({
      111: {
        landCoverClassCode: '110',
        landCoverClassDescription: 'Arable land',
        landCoverCode: '111',
        landCoverDescription: 'Land lying fallow',
        landCoverTypeCode: '100',
        landCoverTypeDescription: 'Agricultural area'
      },
      131: {
        landCoverClassCode: '130',
        landCoverClassDescription: 'Permanent grassland',
        landCoverCode: '131',
        landCoverDescription: 'Permanent grassland',
        landCoverTypeCode: '100',
        landCoverTypeDescription: 'Agricultural area'
      },
      641: {
        landCoverClassCode: '640',
        landCoverClassDescription: 'Natural transport - tracks and gallops',
        landCoverCode: '641',
        landCoverDescription: 'Gallop',
        landCoverTypeCode: '300',
        landCoverTypeDescription: 'Non-agricultural area'
      }
    })
  })

  test('should skip any missing land covers', async () => {
    const landCovers = await getLandCoverDefinitions(
      ['131', 'MISSING', '641'],
      connection,
      logger
    )
    expect(landCovers).toEqual({
      131: {
        landCoverClassCode: '130',
        landCoverClassDescription: 'Permanent grassland',
        landCoverCode: '131',
        landCoverDescription: 'Permanent grassland',
        landCoverTypeCode: '100',
        landCoverTypeDescription: 'Agricultural area'
      },
      641: {
        landCoverClassCode: '640',
        landCoverClassDescription: 'Natural transport - tracks and gallops',
        landCoverCode: '641',
        landCoverDescription: 'Gallop',
        landCoverTypeCode: '300',
        landCoverTypeDescription: 'Non-agricultural area'
      }
    })
  })
})
