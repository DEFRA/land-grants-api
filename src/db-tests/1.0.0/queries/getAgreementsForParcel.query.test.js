import { getAgreementsForParcel } from '../../../api/agreements/queries/getAgreementsForParcel.query.js'
import { connectToTestDatbase } from '../../setup/postgres.js'
import { vi } from 'vitest'

describe('Get Agreements For Parcel Query', () => {
  let logger, connection

  beforeAll(() => {
    logger = {
      info: vi.fn(),
      error: vi.fn()
    }
    connection = connectToTestDatbase()
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
  }, 10000)

  test('should return 1 action when parcel is present', async () => {
    const sheetId = 'SE0034'
    const parcelId = '3133'

    const actions = await getAgreementsForParcel(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(actions).toStrictEqual([
      {
        actionCode: 'MOR1',
        quantity: 48.4547,
        unit: 'ha',
        startDate: new Date('2024-07-01T00:00:00.000Z'),
        endDate: new Date('2027-06-30T00:00:00.000Z')
      },
      {
        actionCode: 'UP3',
        quantity: 48.4547,
        unit: 'ha',
        startDate: new Date('2019-01-01T00:00:00.000Z'),
        endDate: new Date('2028-12-31T00:00:00.000Z')
      }
    ])

    vi.restoreAllMocks()
  }, 30000)
})
