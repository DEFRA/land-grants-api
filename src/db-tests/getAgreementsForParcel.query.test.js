import { getAgreementsForParcel } from '../api/agreements/queries/getAgreementsForParcel.query.js'
import {
  connectToTestDatbase,
  seedForAgreementsTest,
  resetAgreementsTestData
} from './setup/postgres.js'

let connection

const logger = {
  info: jest.fn(),
  error: jest.fn()
}

describe('Get agreement actions for parcel query', () => {
  beforeAll(async () => {
    connection = connectToTestDatbase()
    await seedForAgreementsTest(connection)
  })

  afterAll(async () => {
    await resetAgreementsTestData(connection)
    await connection.end()
  })

  test('should return 0 actions when parcel is missing', async () => {
    const sheetId = 'Missing'
    const parcelId = 'Missing'

    const actions = await getAgreementsForParcel(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(actions).toStrictEqual([])
  }, 10000)

  test('should return 1 action when parcel is present', async () => {
    const sheetId = 'SD6920'
    const parcelId = '69'

    const RealDate = global.Date
    const mockCurrentDate = new RealDate(2025, 10, 1) // November 1, 2025

    jest.spyOn(global, 'Date').mockImplementation((...args) => {
      if (args.length === 0) {
        return mockCurrentDate
      }
      return new RealDate(...args)
    })

    const actions = await getAgreementsForParcel(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(actions[0].actionCode).toBe('CMOR1')
    expect(actions[0].unit).toBe('ha')
    expect(actions[0].quantity).toBe(10)
    expect(actions[0].startDate.toISOString()).toBe('2025-01-01T00:00:00.000Z')
    expect(actions[0].endDate.toISOString()).toBe('2025-11-30T00:00:00.000Z')

    jest.restoreAllMocks()
  }, 30000)
})
