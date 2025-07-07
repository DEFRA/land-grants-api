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

    expect(agreements).toEqual([
      {
        id: 1,
        parcel_id: '7268',
        sheet_id: 'SD6743',
        actions: [
          {
            unit: 'ha',
            quantity: 12.9,
            action_code: 'UPL1'
          }
        ]
      }
    ])
  })
})
