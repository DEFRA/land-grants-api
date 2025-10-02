import { getLandCoverDefinitions } from '../api/land-cover-codes/queries/getLandCoverDefinitions.query.js'
import { connectToTestDatbase } from './setup/postgres.js'
import { logger } from './testLogger.js'

let connection

describe('Get land cover definitions', () => {
  beforeAll(() => {
    connection = connectToTestDatbase()
  })

  afterAll(async () => {
    await connection.end()
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
})
