import { getAgreementsForParcel } from '../api/agreements/queries/getAgreementsForParcel.query.js'
import {
  connectToTestDatbase,
  resetDatabase,
  seedPostgres
} from './setup/postgres.js'

let connection

const logger = {
  info: jest.fn(),
  error: jest.fn()
}

describe('Get agreements for parcel query', () => {
  beforeAll(async () => {
    connection = await connectToTestDatbase()
    await seedPostgres(connection, {
      agreements: true
    })
  }, 60000)

  afterAll(async () => {
    await resetDatabase(connection)
    await connection.end()
  })

  test('should return 0 agreements when parcel is missing', async () => {
    const sheetId = 'Missing'
    const parcelId = 'Missing'

    const agreements = await getAgreementsForParcel(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(agreements).toStrictEqual([])
  })

  test('should return 1 agreement when parcel is present', async () => {
    const sheetId = 'SD6743'
    const parcelId = '7268'

    const agreements = await getAgreementsForParcel(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(agreements[0].parcel_id).toBe('7268')
    expect(agreements[0].sheet_id).toBe('SD6743')
    expect(agreements[0].actions[0].unit).toBe('ha')
    expect(agreements[0].actions[0].quantity).toBe(12.9)
    expect(agreements[0].actions[0].action_code).toBe('UPL1')
  })
})
