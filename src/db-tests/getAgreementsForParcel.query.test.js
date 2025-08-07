import { getAgreementsForParcel } from '../api/agreements/queries/getAgreementsForParcel.query.js'
import { connectToTestDatbase } from './setup/postgres.js'

let connection

const logger = {
  info: jest.fn(),
  error: jest.fn()
}

describe('Get agreement actions for parcel query', () => {
  beforeAll(async () => {
    connection = await connectToTestDatbase()
  })

  afterAll(async () => {
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
  })

  test('should return 1 action when parcel is present', async () => {
    const sheetId = 'SD6743'
    const parcelId = '7268'

    const actions = await getAgreementsForParcel(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(actions[0].actionCode).toBe('UPL1')
    expect(actions[0].unit).toBe('ha')
    expect(actions[0].quantity).toBe(0.1)
  })
})
