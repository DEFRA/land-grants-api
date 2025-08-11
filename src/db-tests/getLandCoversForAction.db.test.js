import {
  getLandCoversForAction,
  getLandCoversForActions
} from '../api/land-cover-codes/queries/getLandCoversForActions.query.js'
import { connectToTestDatbase } from './setup/postgres.js'

let connection

const logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}

describe('Get land cover codes', () => {
  beforeAll(async () => {
    connection = await connectToTestDatbase()
  })

  afterAll(async () => {
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

  test('should return empty array for empty action codes array', async () => {
    const landCovers = await getLandCoversForActions([], connection, logger)
    expect(landCovers).toEqual([])
    expect(logger.warn).toHaveBeenCalledWith('No action codes provided')
  })

  test('should return empty array for non-array input', async () => {
    const landCovers = await getLandCoversForActions(null, connection, logger)
    expect(landCovers).toEqual([])
    expect(logger.warn).toHaveBeenCalledWith('No action codes provided')
  })

  test('should return empty array when we have missing action codes', async () => {
    const landCovers = await getLandCoversForActions(
      ['MISSING1', 'MISSING2'],
      connection,
      logger
    )
    expect(landCovers).toEqual([])
  })

  test('should return land cover codes for single action code in array', async () => {
    const landCovers = await getLandCoversForActions(
      ['GRH8'],
      connection,
      logger
    )
    expect(landCovers).toEqual({
      GRH8: [
        { landCoverCode: '111', landCoverClassCode: '110' },
        { landCoverCode: '112', landCoverClassCode: '110' },
        { landCoverCode: '117', landCoverClassCode: '110' },
        { landCoverCode: '118', landCoverClassCode: '110' },
        { landCoverCode: '131', landCoverClassCode: '130' }
      ]
    })
  })

  test('should return land cover codes for multiple action codes', async () => {
    const landCovers = await getLandCoversForActions(
      ['GRH8', 'CMOR1'],
      connection,
      logger
    )
    expect(landCovers).toHaveProperty('GRH8')
    expect(landCovers).toHaveProperty('CMOR1')
    expect(Array.isArray(landCovers.GRH8)).toBe(true)
    expect(Array.isArray(landCovers.CMOR1)).toBe(true)
  })

  test('should return mixed results for valid and invalid action codes', async () => {
    const landCovers = await getLandCoversForActions(
      ['GRH8', 'MISSING'],
      connection,
      logger
    )
    expect(landCovers).toEqual({
      GRH8: [
        { landCoverCode: '111', landCoverClassCode: '110' },
        { landCoverCode: '112', landCoverClassCode: '110' },
        { landCoverCode: '117', landCoverClassCode: '110' },
        { landCoverCode: '118', landCoverClassCode: '110' },
        { landCoverCode: '131', landCoverClassCode: '130' }
      ],
      MISSING: []
    })
  })
})
