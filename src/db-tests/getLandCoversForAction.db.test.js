import { getLandCoversForAction } from '../api/land-cover-codes/queries/getLandCoversForAction.query.js'
import {
  connectToTestDatbase,
  resetDatabase,
  seedPostgres
} from './setup/postgres.js'

let connection

const logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}

describe('Get land cover codes', () => {
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

  test('should return empty array for missing action code', async () => {
    const landCovers = await getLandCoversForAction(
      'MISSING',
      connection,
      logger
    )
    expect(landCovers).toEqual([])
    expect(true).toBe(true)
  })

  test('should return all land cover codes for GRH8', async () => {
    const landCovers = await getLandCoversForAction('GRH8', connection, logger)
    expect(landCovers).toEqual([
      { land_cover_code: '111', land_cover_class_code: '110' },
      { land_cover_code: '112', land_cover_class_code: '110' },
      { land_cover_code: '117', land_cover_class_code: '110' },
      { land_cover_code: '118', land_cover_class_code: '110' },
      { land_cover_code: '131', land_cover_class_code: '130' }
    ])
    expect(true).toBe(true)
  })
})
