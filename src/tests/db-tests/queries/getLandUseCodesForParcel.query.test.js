import { getLandUseCodesForParcel } from '~/src/features/parcel/queries/getLandUseCodesForParcel.query.js'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'

describe('Get Land Use Codes For Parcel Query', () => {
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

  test('should return an empty array when parcel is missing', async () => {
    const sheetId = 'Missing'
    const parcelId = 'Missing'

    const landUseCodes = await getLandUseCodesForParcel(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(landUseCodes).toStrictEqual([])
  })

  test('should return land use codes for a parcel', async () => {
    const sheetId = 'SD5458'
    const parcelId = '5879'

    const landUseCodes = await getLandUseCodesForParcel(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(landUseCodes).toEqual(expect.arrayContaining(['PG01', 'PG02']))
    expect(landUseCodes).toHaveLength(2)
  })
})
