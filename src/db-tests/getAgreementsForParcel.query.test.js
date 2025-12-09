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
    jest.useFakeTimers().setSystemTime(new Date(2025, 10, 1))
  })

  afterAll(async () => {
    await resetAgreementsTestData(connection)
    await connection.end()
    jest.useRealTimers()
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

    const actions = await getAgreementsForParcel(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(actions[0].actionCode).toBe('CMOR1')
    expect(actions[0].unit).toBe('ha')
    expect(actions[0].quantity).toBe(10)
    expect(actions[0].startDate).toBe(new Date('2025-01-01'))
    expect(actions[0].endDate).toBe(new Date('2025-11-31'))
  }, 10000)
})
