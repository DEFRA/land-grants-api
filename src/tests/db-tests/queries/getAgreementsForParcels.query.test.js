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
    const sheetId = 'SE0001'
    const parcelId = '1000'

    const actions = await getAgreementsForParcels(
      [[parcelId, sheetId]],
      connection,
      logger
    )

    expect(actions).toStrictEqual({
      '1000-SE0001': [
        {
          actionCode: 'MOR1',
          quantity: 20002,
          unit: 'sqm',
          startDate: new Date('2020-01-01T00:00:00.000Z'),
          endDate: new Date('2021-01-01T00:00:00.000Z')
        },
        {
          actionCode: 'UP3',
          quantity: 20001,
          unit: 'sqm',
          startDate: new Date('2022-01-01T00:00:00.000Z'),
          endDate: new Date('2023-01-01T00:00:00.000Z')
        }
      ]
    })

    vi.restoreAllMocks()
  }, 30000)

  test('should return actions for multiple parcels', async () => {
    const parcels = [
      ['1000', 'SE0001'],
      ['1001', 'NT0001'],
      ['1002', 'NT0001']
    ]

    const actions = await getAgreementsForParcels(parcels, connection, logger)

    expect(actions).toStrictEqual({
      '1000-SE0001': [
        {
          actionCode: 'MOR1',
          quantity: 20002,
          unit: 'sqm',
          startDate: new Date('2020-01-01T00:00:00.000Z'),
          endDate: new Date('2021-01-01T00:00:00.000Z')
        },
        {
          actionCode: 'UP3',
          quantity: 20001,
          unit: 'sqm',
          startDate: new Date('2022-01-01T00:00:00.000Z'),
          endDate: new Date('2023-01-01T00:00:00.000Z')
        }
      ],
      '1001-NT0001': [
        {
          actionCode: 'MOR1',
          endDate: new Date('2022-01-01T00:00:00.000Z'),
          quantity: 10002,
          startDate: new Date('2021-01-01T00:00:00.000Z'),
          unit: 'sqm'
        }
      ],
      '1002-NT0001': [
        {
          actionCode: 'MOR1',
          endDate: new Date('2022-01-01T00:00:00.000Z'),
          quantity: 10001,
          startDate: new Date('2021-01-01T00:00:00.000Z'),
          unit: 'sqm'
        }
      ]
    })

    vi.restoreAllMocks()
  }, 30000)
})
