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
      { landCoverCode: '111', landCoverClassCode: '110' },
      { landCoverCode: '112', landCoverClassCode: '110' },
      { landCoverCode: '117', landCoverClassCode: '110' },
      { landCoverCode: '118', landCoverClassCode: '110' },
      { landCoverCode: '131', landCoverClassCode: '130' }
    ])
    expect(true).toBe(true)
  })
})
