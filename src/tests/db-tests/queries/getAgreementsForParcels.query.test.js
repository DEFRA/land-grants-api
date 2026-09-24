import { getAgreementsForParcels } from '~/src/features/agreements/queries/getAgreementsForParcels.query.js'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'

describe('Get Agreements For Parcel Query', () => {
  let logger, connection

  beforeAll(() => {
    logger = {
      info: vi.fn(),
      error: vi.fn()
    }
    connection = connectToTestDatabase()
  })

  afterAll(async () => {
    await connection.end()
  })

  test('should return 0 actions when parcel is missing', async () => {
    const sheetId = 'Missing'
    const parcelId = 'Missing'

    const actions = await getAgreementsForParcels(
      [[parcelId, sheetId]],
      connection,
      logger
    )

    expect(actions).toStrictEqual({})
  }, 10000)

  test('should return 1 action when parcel is present', async () => {
    const sheetId = 'SE0034'
    const parcelId = '3133'

    const actions = await getAgreementsForParcels(
      [[parcelId, sheetId]],
      connection,
      logger
    )

    expect(actions).toStrictEqual({
      '3133-SE0034': [
        {
          actionCode: 'MOR1',
          quantity: 484547,
          unit: 'sqm',
          startDate: new Date('2024-07-01T00:00:00.000Z'),
          endDate: new Date('2027-06-30T00:00:00.000Z')
        },
        {
          actionCode: 'UP3',
          quantity: 484547,
          unit: 'sqm',
          startDate: new Date('2019-01-01T00:00:00.000Z'),
          endDate: new Date('2028-12-31T00:00:00.000Z')
        }
      ]
    })

    vi.restoreAllMocks()
  }, 30000)

  test('should return actions for multiple parcels', async () => {
    const parcels = [
      ['3133', 'SE0034'],
      ['3027', 'NT9116'],
      ['4688', 'NT9116']
    ]

    const actions = await getAgreementsForParcels(parcels, connection, logger)

    expect(actions).toStrictEqual({
      '3133-SE0034': [
        {
          actionCode: 'MOR1',
          quantity: 484547,
          unit: 'sqm',
          startDate: new Date('2024-07-01T00:00:00.000Z'),
          endDate: new Date('2027-06-30T00:00:00.000Z')
        },
        {
          actionCode: 'UP3',
          quantity: 484547,
          unit: 'sqm',
          startDate: new Date('2019-01-01T00:00:00.000Z'),
          endDate: new Date('2028-12-31T00:00:00.000Z')
        }
      ],
      '3027-NT9116': [
        {
          actionCode: 'MOR1',
          endDate: new Date('2027-04-30T00:00:00.000Z'),
          quantity: 245930,
          startDate: new Date('2024-05-01T00:00:00.000Z'),
          unit: 'sqm'
        }
      ],
      '4688-NT9116': [
        {
          actionCode: 'MOR1',
          endDate: new Date('2027-04-30T00:00:00.000Z'),
          quantity: 371,
          startDate: new Date('2024-05-01T00:00:00.000Z'),
          unit: 'sqm'
        }
      ]
    })

    vi.restoreAllMocks()
  }, 30000)
})
