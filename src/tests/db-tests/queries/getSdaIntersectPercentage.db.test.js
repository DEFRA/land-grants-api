import { getSdaIntersectPercentage } from '~/src/features/parcel/queries/getSdaIntersectPercentage.js'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'

describe('Get SDA Intersect Percentage Query', () => {
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

  test.each([
    [
      'wholly within SDA below the moorland line and ref_code = S',
      'NT8701',
      '9412',
      100
    ],
    [
      'wholly within moorland in the SDA and ref_code = MS',
      'NT8109',
      '3967',
      100
    ],
    [
      'split between S and MS, which union to the whole parcel',
      'NT9728',
      '0556',
      100
    ],
    ['mostly MD with a sliver of MS', 'SD5260', '7636', 5],
    ['wholly within the DA and ref_code = D', 'SD5253', '5484', 0],
    ['wholly within moorland in the DA and ref_code = MD', 'SD5260', '7310', 0],
    ['sheet_id found but parcel_id not found', 'SD6842', '1234', 0],
    ['sheet id and parcel id not found', 'SD0000', '1234', 0]
  ])('when %s', async (_desc, sheetId, parcelId, expected) => {
    const result = await getSdaIntersectPercentage(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(result).toBe(expected)
  })
})
